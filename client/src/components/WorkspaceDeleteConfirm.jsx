import { useEffect } from 'react';
import { Folder, GitBranch, Trash2 } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { folderTrail } from '../utils/workspaceTree';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function WorkspaceDeleteConfirm() {
  const { deleteTarget, deleting, deleteError, cancelDelete, confirmDelete, chats, folders, folderStats } =
    useWorkspace();

  useEffect(() => {
    if (!deleteTarget) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !deleting) cancelDelete();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [deleteTarget, deleting, cancelDelete]);

  if (!deleteTarget) return null;

  let title, text, name, path, note, Icon, button;

  if (deleteTarget.kind === 'chat') {
    const chat = chats.find((c) => c.rootId === deleteTarget.id);
    if (!chat) return null;
    Icon = GitBranch;
    title = 'Delete this chat?';
    name = chat.title;
    text = `“${chat.title}” and all ${plural(chat.nodeCount, 'card')} in it will be permanently deleted. This can’t be undone.`;
    path = folderTrail(folders, chat.folderId).join(' / ') || 'Top level';
    note = chat.nodeCount > 1 ? 'Every branch of this chat is deleted with it.' : 'This chat has no branches.';
    button = 'Delete chat';
  } else {
    const folder = folders.find((f) => f._id === deleteTarget.id);
    if (!folder) return null;
    const s = folderStats(folder._id);
    const empty = s.subfolders + s.chats === 0;
    Icon = Folder;
    title = 'Delete this folder?';
    name = folder.name;
    text = empty
      ? `The empty folder “${folder.name}” will be deleted.`
      : `The folder “${folder.name}” and everything inside it will be permanently deleted. This can’t be undone.`;
    path = folderTrail(folders, folder.parentFolderId).join(' / ') || 'Top level';
    note = empty
      ? 'Nothing else will be affected.'
      : `${plural(s.subfolders, 'subfolder')} · ${plural(s.chats, 'chat')} · ${plural(s.cards, 'card')}`;
    button = 'Delete folder';
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && !deleting && cancelDelete()}
    >
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="ws-del-title">
        <div className="modal-head">
          <span className="modal-icon danger">
            <Trash2 size={18} />
          </span>
        </div>

        <h3 id="ws-del-title">{title}</h3>
        <p className="modal-sub">{text}</p>

        <div className="delete-info">
          <div className="delete-info-title">
            <Icon size={15} /> {name}
          </div>
          <div className="delete-info-path">{path}</div>
          <div className="delete-info-note">{note}</div>
        </div>

        {deleteError && <div className="sidebar-error small">{deleteError}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" disabled={deleting} onClick={cancelDelete}>
            Keep
          </button>
          <button type="button" className="btn btn-danger" disabled={deleting} onClick={confirmDelete}>
            <Trash2 size={15} /> {deleting ? 'Deleting…' : button}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceDeleteConfirm;