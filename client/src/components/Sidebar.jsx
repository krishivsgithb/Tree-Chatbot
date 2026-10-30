import { useMemo } from 'react';
import { FolderPlus, Network, Plus, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { buildTree } from '../utils/workspaceTree';
import FolderNode from './FolderNode';
import ChatRow from './ChatRow';
import NewFolderInput from './NewFolderInput';

function Sidebar() {
  const {
    folders,
    chats,
    status,
    error,
    retry,
    newChat,
    creatingIn,
    startCreateFolder,
    cancelCreateFolder,
    finishCreateFolder,
    openMenu,
    cut,
    copy,
    paste,
    pasteTargetFor,
    startRename,
    requestDelete
  } = useWorkspace();

  const tree = useMemo(() => buildTree(folders, chats), [folders, chats]);
  const recent = chats.slice(0, 3);
  const isEmpty = tree.folders.length === 0 && tree.chats.length === 0;
  const ready = status === 'ready';

  // Shortcuts work while a chat or folder row has keyboard focus
  const onTreeKeyDown = (e) => {
    if (e.target.matches('input, textarea')) return;
    const el = e.target.closest('[data-kind]');
    if (!el) return;
    const { kind, id } = el.dataset;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (mod && key === 'x') {
      e.preventDefault();
      cut(kind, id);
    } else if (mod && key === 'c') {
      e.preventDefault();
      copy(kind, id);
    } else if (mod && key === 'v') {
      e.preventDefault();
      paste(pasteTargetFor(kind, id));
    } else if (key === 'f2') {
      e.preventDefault();
      startRename(kind, id);
    } else if (key === 'delete' || key === 'backspace') {
      e.preventDefault();
      requestDelete(kind, id);
    }
  };

  // Right-click on empty space in the list
  const onListContextMenu = (e) => {
    if (e.target.closest('[data-kind]') || !ready) return;
    e.preventDefault();
    openMenu({ kind: 'root', x: e.clientX, y: e.clientY, opener: null });
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-logo">
          <Network size={18} />
        </span>
        <span>Tree Chatbot</span>
        <span className="brand-beta">BETA</span>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={!ready}
        onClick={() => newChat(null)}
      >
        <Plus size={16} /> New chat
      </button>

      <div className="section-head">
        <span>WORKSPACE</span>
        <button
          type="button"
          className="btn icon-btn"
          aria-label="New folder"
          disabled={!ready}
          onClick={() => startCreateFolder('root')}
        >
          <FolderPlus size={16} />
        </button>
      </div>

      <div className="sidebar-list" onKeyDown={onTreeKeyDown} onContextMenu={onListContextMenu}>
        {status === 'loading' && (
          <div className="skeleton-list" aria-label="Loading">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ width: `${92 - i * 11}%` }} />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="sidebar-error">
            <strong>Can’t reach the server</strong>
            <span>{error}. Is the backend running?</span>
            <button type="button" className="btn btn-outline" onClick={retry}>
              Retry
            </button>
          </div>
        )}

        {ready && (
          <>
            {creatingIn === 'root' && (
              <NewFolderInput
                onSubmit={(name) => finishCreateFolder(name, 'root')}
                onCancel={cancelCreateFolder}
              />
            )}

            {isEmpty && creatingIn !== 'root' && (
              <div className="sidebar-empty">
                <strong>No chats yet</strong>
                Your conversations and folders will appear here.
              </div>
            )}

            {tree.folders.map((node) => (
              <FolderNode key={node.folder._id} node={node} depth={0} />
            ))}
            {tree.chats.map((chat) => (
              <ChatRow key={chat.rootId} chat={chat} depth={-1} />
            ))}
          </>
        )}
      </div>

      {ready && recent.length > 0 && (
        <div className="recent">
          <div className="section-head">
            <span>RECENT</span>
          </div>
          {recent.map((chat) => (
            <ChatRow key={chat.rootId} chat={chat} plain />
          ))}
        </div>
      )}

      <div className="note-card">
        <ShieldCheck size={16} />
        <div>
          <strong>Your key stays in this browser.</strong>
          Chats are saved to your database.
        </div>
      </div>

      <div className="workspace-row">
        <span className="avatar">JD</span>
        <div className="grow">
          Personal workspace
          <small>Local · no account needed</small>
        </div>
        <button type="button" className="btn icon-btn" aria-label="Settings">
          <SlidersHorizontal size={16} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;