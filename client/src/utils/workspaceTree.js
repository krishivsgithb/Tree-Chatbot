// Turns flat folders + chats into a nested tree with card counts
export function buildTree(folders, chats) {
  const ids = new Set(folders.map((f) => f._id));
  const subfolders = new Map();
  const folderChats = new Map();

  const add = (map, key, item) => {
    const k = key && ids.has(key) ? key : 'root';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  };

  folders.forEach((f) => add(subfolders, f.parentFolderId, f));
  chats.forEach((c) => add(folderChats, c.folderId, c));

  const make = (folder) => {
    const children = (subfolders.get(folder._id) || []).map(make);
    const own = folderChats.get(folder._id) || [];
    const count =
      own.reduce((n, c) => n + c.nodeCount, 0) + children.reduce((n, c) => n + c.count, 0);
    return { folder, children, chats: own, count };
  };

  return {
    folders: (subfolders.get('root') || []).map(make),
    chats: folderChats.get('root') || []
  };
}
// Folder names from the top down, e.g. ['Product research', 'Experiments']
export function folderTrail(folders, folderId) {
  const byId = new Map(folders.map((f) => [f._id, f]));
  const names = [];
  let id = folderId;
  let guard = 0;
  while (id && byId.has(id) && guard++ < 100) {
    names.unshift(byId.get(id).name);
    id = byId.get(id).parentFolderId;
  }
  return names;
}
// A folder's id plus the ids of every folder below it
export function descendantIds(folders, folderId) {
  const out = new Set([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentFolderId && out.has(f.parentFolderId) && !out.has(f._id)) {
        out.add(f._id);
        grew = true;
      }
    }
  }
  return out;
}