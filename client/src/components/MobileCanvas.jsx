import { ArrowLeft, ArrowRight, ArrowUpLeft } from 'lucide-react';
import ChatCard from './ChatCard';
import DeleteConfirm from './DeleteConfirm';
import ErrorBanner from './ErrorBanner';
import { useChain } from '../hooks/useChain';
import { useWorkspace } from '../hooks/useWorkspace';
import { orderNodes } from '../utils/chain';
import { folderTrail } from '../utils/workspaceTree';

function MobileCanvas() {
  const { nodes, status, loadError, retry, saves, focusId, setFocusId } = useChain();
  const { folders, activeChat } = useWorkspace();

  if (status === 'loading') {
    return <div className="m-canvas m-msg">Loading chat…</div>;
  }
  if (status === 'error') {
    return (
      <div className="m-canvas m-msg">
        <p>Couldn’t load this chat: {loadError}</p>
        <button type="button" className="btn btn-outline" onClick={retry}>
          Retry
        </button>
      </div>
    );
  }

  const order = orderNodes(nodes);
  const found = order.findIndex((n) => n.id === focusId);
  const index = found === -1 ? 0 : found; // a deleted card falls back to the root
  const node = order[index];
  if (!node) return null;

  const prev = order[index - 1];
  const next = order[index + 1];
  const parent = node.data.parentId ? nodes.find((n) => n.id === node.data.parentId) : null;
  const branchCount = parent ? nodes.filter((n) => n.data.parentId === parent.id).length : 0;
  const trail = folderTrail(folders, activeChat?.folderId);
  const total = order.length;

  return (
    <div className="m-canvas">
      <div className="m-head">
        <div className="crumbs">
          {trail.length ? `${trail.join(' / ')} / ` : ''}
          {total} {total === 1 ? 'chat' : 'chats'}
        </div>
        <h2>{activeChat?.title}</h2>
      </div>

      <ErrorBanner />
      {saves.failed && <div className="sidebar-error small">Couldn’t save changes</div>}

      {parent && (
        <>
          <button type="button" className="parent-chip" onClick={() => setFocusId(parent.id)}>
            <ArrowUpLeft size={15} />
            <span className="chip-title">From {parent.data.title}</span>
            <span className="chip-meta">
              {branchCount} {branchCount === 1 ? 'branch' : 'branches'}
            </span>
          </button>
          <div className="m-line" />
        </>
      )}

      <div className="m-card-wrap">
        <ChatCard key={node.id} id={node.id} data={node.data} selected standalone />
      </div>

      <div className="m-nav">
        <button
          type="button"
          className="btn icon-btn"
          aria-label="Previous chat"
          disabled={!prev}
          onClick={() => setFocusId(prev.id)}
        >
          <ArrowLeft size={16} />
        </button>
        <span>
          Viewing {index + 1} of {total} {total === 1 ? 'chat' : 'chats'}
        </span>
        <span className="grow" />
        {next && (
          <button type="button" className="link-btn" onClick={() => setFocusId(next.id)}>
            <span className="chip-title">{next.data.title}</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      <DeleteConfirm />
    </div>
  );
}

export default MobileCanvas;