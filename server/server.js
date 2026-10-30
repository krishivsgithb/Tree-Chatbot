const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Node = require('./models/Node');
const Folder = require('./models/Folder');
const { callModel, PROVIDERS } = require('./services/providers');
const { getFullContext, getAncestorChain } = require('./utils/context');
const { getFolderTreeIds } = require('./utils/tree');

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  req.body = req.body || {};
  next();
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ---------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------

const ObjectId = mongoose.Types.ObjectId;
const DEFAULT_TITLES = ['Untitled chat', 'New branch'];

const sameId = (a, b) => String(a || '') === String(b || '');

const checkId = (req, res, next, value) =>
  mongoose.isValidObjectId(value) ? next() : res.status(400).json({ error: 'Invalid id' });
app.param('id', checkId);
app.param('rootId', checkId);

function fail(res, label, err) {
  console.error(`${label}:`, err.message);
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id' });
  }
  res.status(500).json({ error: 'Something went wrong' });
}

function toClient(n) {
  return {
    nodeId: n._id,
    parentId: n.parentId,
    rootId: n.rootId,
    folderId: n.folderId,
    title: n.title,
    branchLabel: n.branchLabel,
    provider: n.provider,
    model: n.model,
    position: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
    messages: n.messages.map((m) => ({
      role: m.role,
      text: m.text,
      model: m.model,
      createdAt: m.createdAt
    })),
    createdAt: n.createdAt,
    updatedAt: n.updatedAt
  };
}

// A root node's rootId is its own id
function newRoot(fields = {}) {
  const _id = new ObjectId();
  return new Node({ _id, rootId: _id, parentId: null, ...fields });
}

// Fields copied when duplicating a node
const cloneFields = (n) => ({
  title: n.title,
  branchLabel: n.branchLabel,
  provider: n.provider,
  model: n.model,
  position: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
  messages: n.messages.map((m) => ({ role: m.role, text: m.text }))
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

// ---------------------------------------------------------------
// WORKSPACE + CHAINS
// ---------------------------------------------------------------

// Everything the sidebar needs in one call
app.get('/api/workspace', async (req, res) => {
  try {
    const [folders, roots, counts] = await Promise.all([
      Folder.find().sort({ createdAt: 1 }),
      Node.find({ parentId: null }).select('title folderId createdAt updatedAt'),
      Node.aggregate([
        { $group: { _id: '$rootId', nodeCount: { $sum: 1 }, updatedAt: { $max: '$updatedAt' } } }
      ])
    ]);

    const stats = new Map(counts.map((c) => [String(c._id), c]));

    const chats = roots
      .map((r) => {
        const s = stats.get(String(r._id));
        return {
          rootId: r._id,
          title: r.title,
          folderId: r.folderId,
          nodeCount: s ? s.nodeCount : 1,
          createdAt: r.createdAt,
          updatedAt: s ? s.updatedAt : r.updatedAt
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);

    res.json({ folders, chats });
  } catch (err) {
    fail(res, 'Workspace error', err);
  }
});

// Load one whole chain (every card) for the canvas
app.get('/api/chats/:rootId', async (req, res) => {
  try {
    const root = await Node.findById(req.params.rootId);
    if (!root || root.parentId) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const nodes = await Node.find({ rootId: root._id }).sort({ createdAt: 1 });
    res.json({ rootId: root._id, folderId: root.folderId, nodes: nodes.map(toClient) });
  } catch (err) {
    fail(res, 'Load chat error', err);
  }
});

// Create an empty root chat ("New chat")
app.post('/api/chats', async (req, res) => {
  try {
    const { folderId, title, position, provider, model } = req.body;

    if (folderId && !(await Folder.exists({ _id: folderId }))) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    if (provider !== undefined && !PROVIDERS[provider]) {
      return res.status(400).json({ error: 'Unknown provider' });
    }

    const node = newRoot({ folderId: folderId || null });
    if (title && String(title).trim()) node.title = String(title).trim().slice(0, 120);
    if (provider) {
      node.provider = provider;
      node.model = model ? String(model).trim() : '';
    }
    if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) {
      node.position = { x: position.x, y: position.y };
    }

    await node.save();
    res.json(toClient(node));
  } catch (err) {
    fail(res, 'Create chat error', err);
  }
});

// Edit a card: title, edge label, provider, model, canvas position
app.patch('/api/node/:id', async (req, res) => {
  try {
    const node = await Node.findById(req.params.id);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const { title, branchLabel, provider, model, position } = req.body;

    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) return res.status(400).json({ error: 'title cannot be empty' });
      node.title = t.slice(0, 120);
    }
    if (branchLabel !== undefined) {
      node.branchLabel = String(branchLabel).trim().slice(0, 40);
    }
    if (provider !== undefined) {
      if (!PROVIDERS[provider]) return res.status(400).json({ error: 'Unknown provider' });
      node.provider = provider;
    }
    if (model !== undefined) {
      node.model = String(model).trim();
    }
    if (position !== undefined) {
      if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y)) {
        return res.status(400).json({ error: 'position needs numeric x and y' });
      }
      node.position = { x: position.x, y: position.y };
    }

    // Dragging a card must not change "Recent" order, so position-only saves skip timestamps
    const touchesContent = [title, branchLabel, provider, model].some((v) => v !== undefined);
    await node.save({ timestamps: touchesContent });

    res.json(toClient(node));
  } catch (err) {
    fail(res, 'Edit node error', err);
  }
});

// ---------------------------------------------------------------
// CHAT + BRANCHING
// ---------------------------------------------------------------

app.post('/api/chat', async (req, res) => {
  // If the browser disconnects (Stop button), cancel the provider call
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });

  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    const { nodeId, message, folderId, provider = 'gemini', model } = req.body;

    if (!PROVIDERS[provider]) {
      return res.status(400).json({ error: 'Unknown provider' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }
    if (folderId && !(await Folder.exists({ _id: folderId }))) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    let node;
    if (nodeId) {
      node = await Node.findById(nodeId);
      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }
    } else {
      node = newRoot({ folderId: folderId || null });
    }

    // First message names the card (unless it was already renamed)
    if (node.messages.length === 0 && DEFAULT_TITLES.includes(node.title)) {
      const t = message.trim();
      node.title = t.length > 40 ? t.slice(0, 40) + '…' : t;
    }
    node.provider = provider;
    node.model = model || PROVIDERS[provider].defaultModel;

    node.messages.push({ role: 'user', text: message });

    const fullContext = await getFullContext(node);
    const result = await callModel(provider, apiKey, node.model, fullContext, controller.signal);

    if (controller.signal.aborted) return;

    node.messages.push({ role: 'model', text: result.text, model: result.model });
    await node.save();

    res.json({
      ...toClient(node),
      usedModel: result.model,
      fellBack: result.model !== result.requestedModel
    });

  } catch (err) {
    if (controller.signal.aborted) return;

    const s = err.status;

    if (s && /credit|billing|quota|balance/i.test(err.message)) {
      return res.status(402).json({ error: err.message });
    }
    if (s === 429) {
      return res.status(429).json({ error: 'Rate limit reached on this key. Try again later.' });
    }
    if (s === 401 || s === 403 || (s === 400 && /api key/i.test(err.message))) {
      return res.status(401).json({ error: 'Invalid API key for this provider' });
    }
    if (s === 404) {
      return res.status(404).json({ error: 'Model not found. Check the model name.' });
    }
    if (s === 503 || s === 529) {
      return res.status(503).json({ error: 'The model is overloaded right now. Try again or switch provider.' });
    }
    if (s === 504) {
      return res.status(504).json({ error: 'The model took too long to respond. Try again.' });
    }
    if (s === 502) {
      return res.status(502).json({ error: 'Could not reach the provider. Check your connection.' });
    }

    fail(res, 'Chat route error', err);
  }
});

// Branch: create an empty child card under a parent
app.post('/api/branch', async (req, res) => {
  try {
    const { parentNodeId, branchLabel = '' } = req.body;
    if (!parentNodeId) {
      return res.status(400).json({ error: 'parentNodeId is required' });
    }

    const parent = await Node.findById(parentNodeId);
    if (!parent) {
      return res.status(404).json({ error: 'Parent node not found' });
    }

    const siblings = await Node.countDocuments({ parentId: parent._id });

    const child = new Node({
      parentId: parent._id,
      rootId: parent.rootId || parent._id,
      title: 'New branch',
      branchLabel: String(branchLabel).trim().slice(0, 40),
      provider: parent.provider,
      model: parent.model,
      position: {
        x: (parent.position?.x ?? 0) + 460,
        y: (parent.position?.y ?? 0) + siblings * 520
      }
    });

    await child.save();
    res.json(toClient(child));
  } catch (err) {
    fail(res, 'Branch route error', err);
  }
});

// Debug only: root → ... → this node
app.get('/api/node/:id/path', async (req, res) => {
  try {
    const node = await Node.findById(req.params.id);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const chain = await getAncestorChain(node);
    res.json(
      chain.map((n) => ({
        nodeId: n._id,
        parentId: n.parentId,
        title: n.title,
        messages: n.messages
      }))
    );
  } catch (err) {
    fail(res, 'Path route error', err);
  }
});

// ---------------------------------------------------------------
// FOLDERS
// ---------------------------------------------------------------

app.post('/api/folders', async (req, res) => {
  try {
    const { name, parentFolderId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (parentFolderId && !(await Folder.exists({ _id: parentFolderId }))) {
      return res.status(404).json({ error: 'Parent folder not found' });
    }

    const folder = await Folder.create({
      name: name.trim().slice(0, 80),
      parentFolderId: parentFolderId || null
    });
    res.json(folder);
  } catch (err) {
    fail(res, 'Create folder error', err);
  }
});

app.get('/api/folders', async (req, res) => {
  try {
    res.json(await Folder.find().sort({ createdAt: 1 }));
  } catch (err) {
    fail(res, 'List folders error', err);
  }
});

// Rename a folder
app.patch('/api/folders/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    folder.name = String(name).trim().slice(0, 80);
    await folder.save();
    res.json(folder);
  } catch (err) {
    fail(res, 'Rename folder error', err);
  }
});

// Chains directly inside one folder (debug; the sidebar uses /api/workspace)
app.get('/api/folders/:id/chats', async (req, res) => {
  try {
    const roots = await Node.find({ folderId: req.params.id, parentId: null })
      .sort({ createdAt: -1 });

    res.json(
      roots.map((n) => ({ nodeId: n._id, title: n.title, createdAt: n.createdAt }))
    );
  } catch (err) {
    fail(res, 'List chats error', err);
  }
});

// Move a folder under another folder (or to the top level with null)
app.patch('/api/folders/:id/move', async (req, res) => {
  try {
    const { parentFolderId } = req.body;

    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (parentFolderId) {
      if (!(await Folder.exists({ _id: parentFolderId }))) {
        return res.status(404).json({ error: 'Target folder not found' });
      }

      const subtreeIds = await getFolderTreeIds(folder._id);
      if (subtreeIds.some((id) => sameId(id, parentFolderId))) {
        return res.status(400).json({
          error: 'A folder cannot be moved into itself or one of its own subfolders'
        });
      }
    }

    folder.parentFolderId = parentFolderId || null;
    await folder.save();

    res.json({ folderId: folder._id, parentFolderId: folder.parentFolderId });
  } catch (err) {
    fail(res, 'Move folder error', err);
  }
});

// Copy a folder with all subfolders and every chain inside
app.post('/api/folders/:id/copy', async (req, res) => {
  try {
    const { parentFolderId = null } = req.body;

    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    if (parentFolderId && !(await Folder.exists({ _id: parentFolderId }))) {
      return res.status(404).json({ error: 'Target folder not found' });
    }

    const folderIds = await getFolderTreeIds(folder._id);
    if (parentFolderId && folderIds.some((id) => sameId(id, parentFolderId))) {
      return res.status(400).json({
        error: 'A folder cannot be copied into itself or one of its own subfolders'
      });
    }

    // 1. Folders: new ids, parents re-pointed at the new copies
    const oldFolders = await Folder.find({ _id: { $in: folderIds } });
    const folderMap = new Map(oldFolders.map((f) => [String(f._id), new ObjectId()]));
    const sameLocation = sameId(parentFolderId, folder.parentFolderId);

    const newFolders = oldFolders.map((f) => {
      const isTop = sameId(f._id, folder._id);
      return {
        _id: folderMap.get(String(f._id)),
        name: isTop && sameLocation ? `${f.name} (copy)`.slice(0, 80) : f.name,
        parentFolderId: isTop ? (parentFolderId || null) : folderMap.get(String(f.parentFolderId))
      };
    });

    // 2. Chains inside those folders: new ids for every node
    const roots = await Node.find({ folderId: { $in: folderIds }, parentId: null }).select('_id');
    const oldNodes = await Node.find({ rootId: { $in: roots.map((r) => r._id) } });
    const idMap = new Map(oldNodes.map((n) => [String(n._id), new ObjectId()]));

    const newNodes = oldNodes.map((n) => ({
      ...cloneFields(n),
      _id: idMap.get(String(n._id)),
      parentId: n.parentId ? idMap.get(String(n.parentId)) : null,
      rootId: idMap.get(String(n.rootId)),
      folderId: n.parentId ? null : folderMap.get(String(n.folderId))
    }));

    await Folder.insertMany(newFolders);
    try {
      if (newNodes.length > 0) await Node.insertMany(newNodes);
    } catch (e) {
      // Undo the folders so a half-finished copy isn't left behind
      await Folder.deleteMany({ _id: { $in: [...folderMap.values()] } });
      throw e;
    }

    res.json({
      newFolderId: folderMap.get(String(folder._id)),
      copiedFolders: newFolders.length,
      copiedChats: roots.length,
      copiedNodes: newNodes.length
    });
  } catch (err) {
    fail(res, 'Copy folder error', err);
  }
});

// Delete a folder + subfolders (refuses if non-empty unless ?force=true)
app.delete('/api/folders/:id', async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const folderIds = await getFolderTreeIds(folder._id);
    const subfolderCount = folderIds.length - 1;

    const roots = await Node.find({
      folderId: { $in: folderIds },
      parentId: null
    }).select('_id');

    const isEmpty = roots.length === 0 && subfolderCount === 0;
    if (!isEmpty && req.query.force !== 'true') {
      return res.status(409).json({
        error: 'Folder is not empty',
        subfolderCount,
        chatCount: roots.length
      });
    }

    let deletedNodes = 0;
    if (roots.length > 0) {
      const r = await Node.deleteMany({ rootId: { $in: roots.map((x) => x._id) } });
      deletedNodes = r.deletedCount;
    }

    await Folder.deleteMany({ _id: { $in: folderIds } });

    res.json({ deletedFolders: folderIds.length, deletedNodes });
  } catch (err) {
    fail(res, 'Delete folder error', err);
  }
});

// ---------------------------------------------------------------
// MOVE / COPY / DELETE CHAINS
// ---------------------------------------------------------------

// Move a chain to another folder (or out of folders with null)
app.patch('/api/node/:id/move', async (req, res) => {
  try {
    const { folderId } = req.body;

    const node = await Node.findById(req.params.id);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    if (node.parentId) {
      return res.status(400).json({ error: 'Only root chats can be moved' });
    }
    if (folderId && !(await Folder.exists({ _id: folderId }))) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    node.folderId = folderId || null;
    await node.save();

    res.json({ nodeId: node._id, folderId: node.folderId });
  } catch (err) {
    fail(res, 'Move error', err);
  }
});

// Copy a whole chain (root + every branch) into a folder
app.post('/api/node/:id/copy', async (req, res) => {
  try {
    const { folderId = null } = req.body;

    const root = await Node.findById(req.params.id);
    if (!root) {
      return res.status(404).json({ error: 'Node not found' });
    }
    if (root.parentId) {
      return res.status(400).json({ error: 'Only root chats can be copied' });
    }
    if (folderId && !(await Folder.exists({ _id: folderId }))) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const oldNodes = await Node.find({ rootId: root._id });
    const idMap = new Map(oldNodes.map((n) => [String(n._id), new ObjectId()]));
    const newRootId = idMap.get(String(root._id));
    const sameFolder = sameId(folderId, root.folderId);

    const newNodes = oldNodes.map((n) => {
      const isRoot = sameId(n._id, root._id);
      const copy = {
        ...cloneFields(n),
        _id: idMap.get(String(n._id)),
        parentId: n.parentId ? idMap.get(String(n.parentId)) : null,
        rootId: newRootId,
        folderId: isRoot ? (folderId || null) : null
      };
      if (isRoot && sameFolder) copy.title = `${n.title} (copy)`.slice(0, 120);
      return copy;
    });

    await Node.insertMany(newNodes);

    res.json({ newRootId, copiedNodes: newNodes.length });
  } catch (err) {
    fail(res, 'Copy error', err);
  }
});

// Delete one node (only if nothing branches off it)
app.delete('/api/node/:id', async (req, res) => {
  try {
    const node = await Node.findById(req.params.id);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const childCount = await Node.countDocuments({ parentId: node._id });
    if (childCount > 0) {
      return res.status(400).json({ error: 'Only nodes with no branches can be deleted' });
    }

    await node.deleteOne();

    // The parent becomes the new tip (null if this was a root)
    res.json({ deleted: node._id, newTipId: node.parentId });
  } catch (err) {
    fail(res, 'Delete node error', err);
  }
});

// Delete a whole chain
app.delete('/api/node/:id/tree', async (req, res) => {
  try {
    const node = await Node.findById(req.params.id);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    if (node.parentId) {
      return res.status(400).json({ error: 'Only a root chat can be deleted as a whole tree' });
    }

    const r = await Node.deleteMany({ rootId: node._id });
    res.json({ deletedNodes: r.deletedCount });
  } catch (err) {
    fail(res, 'Delete tree error', err);
  }
});

// ---------------------------------------------------------------

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});