import { useCallback, useEffect, useMemo, useState } from 'react';
import { WorkspaceContext } from './workspaceContext';
import { api } from '../api/client';
import { descendantIds } from '../utils/workspaceTree';

const ACTIVE_KEY = 'activeRootId';
let toastSeq = 0;
const same = (a, b) => (a || null) === (b || null);

export function WorkspaceProvider({ children }) {
  const [folders, setFolders] = useState([]);
  const [chats, setChats] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_KEY) || null;
    } catch {
      return null;
    }
  });

  const [clipboard, setClipboard] = useState(null); // { mode, kind, id }
  const [renaming, setRenaming] = useState(null); // { kind, id }
  const [creatingIn, setCreatingIn] = useState(null); // 'root' | folderId | null
  const [menu, setMenu] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toasts, setToasts] = useState([]);
  const [overrides, setOverrides] = useState({}); // folderId -> open/closed set by the user

  // ---------- loading ----------
  const refresh = useCallback(async () => {
    const data = await api('/api/workspace');
    setFolders(data.folders);
    setChats(data.chats);
  }, []);

  const load = useCallback(async () => {
    try {
      await refresh();
      setError('');
      setStatus('ready');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, [refresh]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setStatus('loading');
    load();
  };

  const select = (id) => {
    setActiveId(id);
    try {
      if (id) localStorage.setItem(ACTIVE_KEY, id);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // storage unavailable: selection lasts for this visit only
    }
  };

  // ---------- toasts ----------
  const pushToast = useCallback((message, { undo, kind } = {}) => {
    const id = ++toastSeq;
    setToasts((t) => [...t.slice(-2), { id, message, undo, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 7000);
  }, []);
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const guard = async (fn) => {
    try {
      await fn();
    } catch (e) {
      pushToast(e.message, { kind: 'error' });
    }
  };

  // ---------- local updates ----------
  // patch can be an object, or a function that receives the chat
  const updateChat = (rootId, patch) =>
    setChats((prev) =>
      prev
        .map((c) =>
          c.rootId === rootId ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c
        )
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    );

  const updateFolder = (id, patch) =>
    setFolders((prev) => prev.map((f) => (f._id === id ? { ...f, ...patch } : f)));

  const removeChat = (rootId) => {
    setChats((prev) => prev.filter((c) => c.rootId !== rootId));
    if (activeId === rootId) select(null);
  };

  // ---------- folder open/closed ----------
  const activeChat = chats.find((c) => c.rootId === activeId) || null;
  const activeRootId = activeChat ? activeChat.rootId : null;

  // Folders on the path to the selected chat open by default
  const openByDefault = useMemo(() => {
    const set = new Set();
    const byId = new Map(folders.map((f) => [f._id, f]));
    let id = chats.find((c) => c.rootId === activeRootId)?.folderId;
    let guardCount = 0;
    while (id && byId.has(id) && guardCount++ < 100) {
      set.add(id);
      id = byId.get(id).parentFolderId;
    }
    return set;
  }, [folders, chats, activeRootId]);

  const isFolderOpen = (id) => overrides[id] ?? openByDefault.has(id);
  const toggleFolder = (id) => setOverrides((p) => ({ ...p, [id]: !isFolderOpen(id) }));
  const expandFolder = (id) => setOverrides((p) => ({ ...p, [id]: true }));

  // ---------- create ----------
  const createChat = async (folderId = null) => {
    const node = await api('/api/chats', { method: 'POST', body: { folderId } });
    const chat = {
      rootId: node.nodeId,
      title: node.title,
      folderId: node.folderId,
      nodeCount: 1,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt
    };
    setChats((prev) => [chat, ...prev]);
    if (folderId) expandFolder(folderId);
    select(chat.rootId);
    return chat;
  };
  const newChat = (folderId = null) => guard(() => createChat(folderId));

  const createFolder = async (name, parentFolderId = null) => {
    const folder = await api('/api/folders', { method: 'POST', body: { name, parentFolderId } });
    setFolders((prev) => [...prev, folder]);
    if (parentFolderId) expandFolder(parentFolderId);
    return folder;
  };

  const startCreateFolder = (parentId = 'root') => {
    setCreatingIn(parentId);
    if (parentId !== 'root') expandFolder(parentId);
  };
  const cancelCreateFolder = () => setCreatingIn(null);
  const finishCreateFolder = (name, parentId) => {
    setCreatingIn(null);
    guard(() => createFolder(name, parentId === 'root' ? null : parentId));
  };

  // ---------- menu ----------
  const openMenu = useCallback((m) => setMenu(m), []);
  const closeMenu = useCallback(() => setMenu(null), []);

  // ---------- rename ----------
  const startRename = (kind, id) => setRenaming({ kind, id });
  const stopRename = () => setRenaming(null);

  const commitRename = (kind, id, value) => {
    setRenaming(null);
    const v = value.trim();
    if (!v) return;

    if (kind === 'chat') {
      const chat = chats.find((c) => c.rootId === id);
      if (!chat || v === chat.title) return;
      const old = chat.title;
      updateChat(id, { title: v });
      guard(async () => {
        try {
          const res = await api(`/api/node/${id}`, { method: 'PATCH', body: { title: v } });
          updateChat(id, { updatedAt: res.updatedAt });
        } catch (e) {
          updateChat(id, { title: old });
          throw e;
        }
      });
    } else {
      const folder = folders.find((f) => f._id === id);
      if (!folder || v === folder.name) return;
      const old = folder.name;
      updateFolder(id, { name: v });
      guard(async () => {
        try {
          await api(`/api/folders/${id}`, { method: 'PATCH', body: { name: v } });
        } catch (e) {
          updateFolder(id, { name: old });
          throw e;
        }
      });
    }
  };

  // ---------- cut / copy / paste ----------
  const cut = (kind, id) => setClipboard({ mode: 'cut', kind, id });
  const copy = (kind, id) => setClipboard({ mode: 'copy', kind, id });

  const pasteTargetFor = (kind, id) =>
    kind === 'folder' ? id : chats.find((c) => c.rootId === id)?.folderId || null;

  const canPaste = (target) => {
    if (!clipboard) return false;
    if (clipboard.kind === 'chat') {
      const chat = chats.find((c) => c.rootId === clipboard.id);
      if (!chat) return false;
      return !(clipboard.mode === 'cut' && same(chat.folderId, target));
    }
    const folder = folders.find((f) => f._id === clipboard.id);
    if (!folder) return false;
    if (target && descendantIds(folders, clipboard.id).has(target)) return false;
    return !(clipboard.mode === 'cut' && same(folder.parentFolderId, target));
  };

  const moveChatApi = async (id, folderId) => {
    await api(`/api/node/${id}/move`, { method: 'PATCH', body: { folderId } });
    updateChat(id, { folderId });
  };
  const moveFolderApi = async (id, parentFolderId) => {
    await api(`/api/folders/${id}/move`, { method: 'PATCH', body: { parentFolderId } });
    updateFolder(id, { parentFolderId });
  };

  const paste = (target = null) =>
    guard(async () => {
      if (!clipboard || !canPaste(target)) return;
      const { mode, kind, id } = clipboard;
      const folderName = target ? folders.find((f) => f._id === target)?.name : null;
      const where = folderName ? `folder “${folderName}”` : 'the top level';
      const noun = kind === 'chat' ? 'Chat' : 'Folder';

      if (mode === 'cut') {
        if (kind === 'chat') {
          const prev = chats.find((c) => c.rootId === id)?.folderId || null;
          await moveChatApi(id, target);
          pushToast(`${noun} moved to ${where}`, { undo: () => guard(() => moveChatApi(id, prev)) });
        } else {
          const prev = folders.find((f) => f._id === id)?.parentFolderId || null;
          await moveFolderApi(id, target);
          pushToast(`${noun} moved to ${where}`, { undo: () => guard(() => moveFolderApi(id, prev)) });
        }
        setClipboard(null);
      } else if (kind === 'chat') {
        const r = await api(`/api/node/${id}/copy`, { method: 'POST', body: { folderId: target } });
        await refresh();
        pushToast(`${noun} pasted into ${where}`, {
          undo: () =>
            guard(async () => {
              await api(`/api/node/${r.newRootId}/tree`, { method: 'DELETE' });
              await refresh();
            })
        });
      } else {
        const r = await api(`/api/folders/${id}/copy`, {
          method: 'POST',
          body: { parentFolderId: target }
        });
        await refresh();
        pushToast(`${noun} pasted into ${where}`, {
          undo: () =>
            guard(async () => {
              await api(`/api/folders/${r.newFolderId}?force=true`, { method: 'DELETE' });
              await refresh();
            })
        });
      }
      if (target) expandFolder(target);
    });

  // ---------- delete ----------
  const folderStats = (folderId) => {
    const ids = descendantIds(folders, folderId);
    const inside = chats.filter((c) => c.folderId && ids.has(c.folderId));
    return {
      subfolders: ids.size - 1,
      chats: inside.length,
      cards: inside.reduce((n, c) => n + c.nodeCount, 0)
    };
  };

  const requestDelete = (kind, id) => {
    setDeleteError('');
    setDeleteTarget({ kind, id });
  };
  const cancelDelete = useCallback(() => setDeleteTarget(null), []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { kind, id } = deleteTarget;
    setDeleting(true);
    setDeleteError('');
    try {
      if (kind === 'chat') {
        await api(`/api/node/${id}/tree`, { method: 'DELETE' });
        removeChat(id);
        pushToast('Chat deleted');
      } else {
        const stats = folderStats(id);
        const force = stats.subfolders + stats.chats > 0;
        try {
          await api(`/api/folders/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' });
        } catch (e) {
          if (e.status === 409) {
            await refresh();
            throw new Error('This folder changed. Review what’s inside and try again.');
          }
          throw e;
        }
        await refresh();
        pushToast('Folder deleted');
      }
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const value = {
    folders,
    chats,
    status,
    error,
    retry,
    activeChat,
    activeRootId,
    select,
    createChat,
    createFolder,
    newChat,
    updateChat,
    removeChat,
    isFolderOpen,
    toggleFolder,
    creatingIn,
    startCreateFolder,
    cancelCreateFolder,
    finishCreateFolder,
    menu,
    openMenu,
    closeMenu,
    renaming,
    startRename,
    stopRename,
    commitRename,
    clipboard,
    cut,
    copy,
    paste,
    canPaste,
    pasteTargetFor,
    folderStats,
    deleteTarget,
    deleting,
    deleteError,
    requestDelete,
    cancelDelete,
    confirmDelete,
    toasts,
    dismissToast
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}