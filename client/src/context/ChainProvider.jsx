import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyNodeChanges, useReactFlow } from '@xyflow/react';
import { ChainContext } from './chainContext';
import { api } from '../api/client';
import { useSettings } from '../hooks/useSettings';
import { useWorkspace } from '../hooks/useWorkspace';
import { buildEdges, describeError, toFlowNode } from '../utils/chain';

export function ChainProvider({ rootId, children }) {
  const { provider, providerConfig, apiKey, model, openKeyModal } = useSettings();
  const { updateChat, removeChat, activeChat } = useWorkspace();
  const { fitView } = useReactFlow();

  const [nodes, setNodes] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [banner, setBanner] = useState(null);
  const [saves, setSaves] = useState({ inflight: 0, failed: false });
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  // The sidebar can rename this chat: keep the root card's title in step
  const chatTitle = activeChat?.title;
  const [seenTitle, setSeenTitle] = useState(chatTitle);
  if (chatTitle !== seenTitle) {
    setSeenTitle(chatTitle);
    if (chatTitle) {
      setNodes((ns) =>
        ns.map((n) => (n.id === rootId ? { ...n, data: { ...n.data, title: chatTitle } } : n))
      );
    }
  }

  const nodesRef = useRef(nodes);
  const controllers = useRef(new Map());

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Leaving this chat cancels anything still thinking
  useEffect(() => {
    const map = controllers.current;
    return () => map.forEach((c) => c.abort());
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/chats/${rootId}`);
      setNodes(data.nodes.map(toFlowNode));
      setStatus('ready');
    } catch (e) {
      setLoadError(e.message);
      setStatus('error');
    }
  }, [rootId]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setStatus('loading');
    load();
  };

  const patch = useCallback((id, partial) => {
    setNodes((ns) =>
      ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...partial } } : n))
    );
  }, []);

  // Runs a save and tracks it for the "All changes saved" indicator
  const persist = useCallback(async (fn) => {
    setSaves((s) => ({ ...s, inflight: s.inflight + 1 }));
    try {
      await fn();
      setSaves((s) => ({ inflight: s.inflight - 1, failed: false }));
      return true;
    } catch {
      setSaves((s) => ({ inflight: s.inflight - 1, failed: true }));
      return false;
    }
  }, []);

  const onNodesChange = useCallback(
    (changes) => setNodes((ns) => applyNodeChanges(changes, ns)),
    []
  );

  const savePosition = (id, position) =>
    persist(() => api(`/api/node/${id}`, { method: 'PATCH', body: { position } }));

  const setDraft = (id, value) => patch(id, { draft: value });
  const dismissBanner = () => setBanner(null);

  const rename = async (id, title) => {
    const t = title.trim().slice(0, 120);
    const node = nodesRef.current.find((n) => n.id === id);
    if (!t || !node || t === node.data.title) return;
    const old = node.data.title;
    const isRoot = !node.data.parentId;

    patch(id, { title: t });
    if (isRoot) updateChat(rootId, { title: t });

    const ok = await persist(() =>
      api(`/api/node/${id}`, { method: 'PATCH', body: { title: t } })
    );
    if (!ok) {
      patch(id, { title: old });
      if (isRoot) updateChat(rootId, { title: old });
    }
  };

  // The label on the line leading into this card
  const setLabel = async (id, value) => {
    const label = value.trim().slice(0, 40);
    const node = nodesRef.current.find((n) => n.id === id);
    if (!node || label === node.data.branchLabel) return;
    const old = node.data.branchLabel;

    patch(id, { branchLabel: label });
    const ok = await persist(() =>
      api(`/api/node/${id}`, { method: 'PATCH', body: { branchLabel: label } })
    );
    if (!ok) patch(id, { branchLabel: old });
  };

  const send = async (id) => {
    const node = nodesRef.current.find((n) => n.id === id);
    if (!node || node.data.status === 'thinking') return;
    const text = node.data.draft.trim();
    if (!text) return;
    if (!apiKey) {
      openKeyModal(provider);
      return;
    }

    const isRoot = !node.data.parentId;
    const controller = new AbortController();
    controllers.current.set(id, controller);

    patch(id, { status: 'thinking', pending: text, draft: '', error: null });
    setBanner(null);

    try {
      const res = await api('/api/chat', {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        signal: controller.signal,
        body: { nodeId: id, message: text, provider, model }
      });

      patch(id, {
        messages: res.messages,
        title: res.title,
        provider: res.provider,
        model: res.model,
        status: 'idle',
        pending: null,
        error: null
      });
      updateChat(rootId, () => ({
        updatedAt: res.updatedAt,
        ...(isRoot ? { title: res.title } : {})
      }));
    } catch (e) {
      if (e.name === 'AbortError') {
        patch(id, { status: 'idle', pending: null, draft: text });
        return;
      }
      if (e.status === 401) {
        patch(id, { status: 'idle', pending: null, draft: text });
        setBanner({
          kind: 'key',
          title: `Invalid API key for ${providerConfig.label}`,
          message: 'Your message wasn’t sent. Update your key to continue this branch.'
        });
        return;
      }
      patch(id, {
        status: 'error',
        pending: null,
        draft: text,
        error: describeError(e, providerConfig.label)
      });
    } finally {
      controllers.current.delete(id);
    }
  };

  const stop = (id) => controllers.current.get(id)?.abort();

  const branch = async (parentId) => {
    const parent = nodesRef.current.find((n) => n.id === parentId);
    if (!parent || parent.data.messages.length === 0 || parent.data.status === 'thinking') return;

    try {
      const n = await api('/api/branch', { method: 'POST', body: { parentNodeId: parentId } });
      const created = toFlowNode(n);
      setNodes((ns) => [
        ...ns.map((x) => ({ ...x, selected: false })),
        { ...created, selected: true }
      ]);
      updateChat(rootId, (c) => ({ nodeCount: c.nodeCount + 1 }));
      // Wait a moment so the new card is measured, then bring it into view
      setTimeout(
        () => fitView({ nodes: [{ id: created.id }], duration: 400, maxZoom: 1, padding: 0.4 }),
        80
      );
    } catch (e) {
      setBanner({ kind: 'info', title: 'Couldn’t create the branch', message: e.message });
    }
  };

  const requestDelete = (id) => {
    setDeleteError('');
    setConfirmId(id);
  };
  const cancelDelete = useCallback(() => setConfirmId(null), []);

  const performDelete = async () => {
    const id = confirmId;
    if (!id) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await api(`/api/node/${id}`, { method: 'DELETE' });
      if (!res.newTipId) {
        removeChat(rootId); // the root was deleted: the whole chat is gone
        return;
      }
      setNodes((ns) =>
        ns.filter((n) => n.id !== id).map((n) => ({ ...n, selected: n.id === res.newTipId }))
      );
      updateChat(rootId, (c) => ({ nodeCount: Math.max(1, c.nodeCount - 1) }));
      setConfirmId(null);
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const edges = useMemo(() => buildEdges(nodes), [nodes]);

  const value = {
    nodes,
    edges,
    status,
    loadError,
    retry,
    banner,
    dismissBanner,
    saves,
    onNodesChange,
    savePosition,
    setDraft,
    rename,
    setLabel,
    send,
    stop,
    branch,
    confirmId,
    deleting,
    deleteError,
    requestDelete,
    cancelDelete,
    performDelete
  };

  return <ChainContext.Provider value={value}>{children}</ChainContext.Provider>;
}