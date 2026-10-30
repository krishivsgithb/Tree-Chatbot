import { GitBranch, MoreHorizontal } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import RenameInput from './RenameInput';

function ChatRow({ chat, depth = 0, plain = false }) {
  const { activeRootId, select, clipboard, renaming, commitRename, stopRename, openMenu, menu } =
    useWorkspace();
  const active = chat.rootId === activeRootId;

  // RECENT list: open only, no menu
  if (plain) {
    return (
      <button
        type="button"
        className={`tree-row ${active ? 'active' : ''}`}
        style={{ paddingLeft: 8 }}
        onClick={() => select(chat.rootId)}
        title={chat.title}
      >
        <span className="row-label">{chat.title}</span>
      </button>
    );
  }

  const indent = 8 + depth * 14 + 20;
  const marked = clipboard?.kind === 'chat' && clipboard.id === chat.rootId ? clipboard.mode : null;
  const isRenaming = renaming?.kind === 'chat' && renaming.id === chat.rootId;
  const menuOpen = menu?.kind === 'chat' && menu.id === chat.rootId;

  const onContextMenu = (e) => {
    e.preventDefault();
    openMenu({
      kind: 'chat',
      id: chat.rootId,
      x: e.clientX,
      y: e.clientY,
      opener: e.currentTarget.querySelector('.tree-row')
    });
  };
  const onDots = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    openMenu({ kind: 'chat', id: chat.rootId, x: r.left, y: r.bottom + 4, opener: e.currentTarget });
  };

  return (
    <div
      className={`tree-item ${marked ? `is-${marked}` : ''}`}
      data-kind="chat"
      data-id={chat.rootId}
      onContextMenu={onContextMenu}
    >
      {isRenaming ? (
        <div className="tree-row editing" style={{ paddingLeft: indent }}>
          <GitBranch size={15} className="row-icon" />
          <RenameInput
            initial={chat.title}
            onCommit={(v) => commitRename('chat', chat.rootId, v)}
            onCancel={stopRename}
          />
        </div>
      ) : (
        <>
          <button
            type="button"
            className={`tree-row ${active ? 'active' : ''}`}
            style={{ paddingLeft: indent }}
            onClick={() => select(chat.rootId)}
            title={chat.title}
            aria-current={active ? 'true' : undefined}
          >
            <GitBranch size={15} className="row-icon" />
            <span className="row-label">{chat.title}</span>
            <span className="row-count">{chat.nodeCount}</span>
          </button>
          <button
            type="button"
            className="row-menu-btn"
            aria-label={`Options for ${chat.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={onDots}
          >
            <MoreHorizontal size={16} />
          </button>
        </>
      )}
    </div>
  );
}

export default ChatRow;