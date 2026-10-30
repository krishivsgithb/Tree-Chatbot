import { useEffect } from 'react';
import { GitBranch, Trash2 } from 'lucide-react';
import { useChain } from '../hooks/useChain';
import { useWorkspace } from '../hooks/useWorkspace';
import { folderTrail } from '../utils/workspaceTree';

function DeleteConfirm() {
  const { nodes, confirmId, deleting, deleteError, cancelDelete, performDelete } = useChain();
  const { folders, activeChat } = useWorkspace();

  useEffect(() => {
    if (!confirmId) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !deleting) cancelDelete();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmId, deleting, cancelDelete]);

  const node = nodes.find((n) => n.id === confirmId);
  if (!confirmId || !node) return null;

  const count = node.data.messages.length;
  const parentTitle = node.data.parentId
    ? nodes.find((n) => n.id === node.data.parentId)?.data.title
    : null;
  const trail = folderTrail(folders, activeChat?.folderId);
  const path = [...trail, parentTitle || 'Root chat'].join(' / ');

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && !deleting && cancelDelete()}
    >
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="del-title">
        <div className="modal-head">
          <span className="modal-icon danger">
            <Trash2 size={18} />
          </span>
        </div>

        <h3 id="del-title">Delete this chat?</h3>
        <p className="modal-sub">
          “{node.data.title}” and its {count} {count === 1 ? 'message' : 'messages'} will be
          permanently deleted. This can’t be undone.
        </p>

        <div className="delete-info">
          <div className="delete-info-title">
            <GitBranch size={15} /> {node.data.title}
          </div>
          <div className="delete-info-path">{path}</div>
          <div className="delete-info-note">
            {parentTitle
              ? 'The parent chat and the other branches will be kept.'
              : 'This chat has no branches.'}
          </div>
        </div>

        {deleteError && <div className="sidebar-error small">{deleteError}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" disabled={deleting} onClick={cancelDelete}>
            Keep chat
          </button>
          <button type="button" className="btn btn-danger" disabled={deleting} onClick={performDelete}>
            <Trash2 size={15} /> {deleting ? 'Deleting…' : 'Delete chat'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirm;