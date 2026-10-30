import { ChevronRight, Folder, FolderOpen, MoreHorizontal } from 'lucide-react';
import ChatRow from './ChatRow';
import NewFolderInput from './NewFolderInput';
import RenameInput from './RenameInput';
import { useWorkspace } from '../hooks/useWorkspace';

function FolderNode({ node, depth }) {
  const {
    isFolderOpen,
    toggleFolder,
    clipboard,
    renaming,
    commitRename,
    stopRename,
    openMenu,
    menu,
    creatingIn,
    finishCreateFolder,
    cancelCreateFolder
  } = useWorkspace();

  const id = node.folder._id;
  const open = isFolderOpen(id);
  const Icon = open ? FolderOpen : Folder;
  const isCreating = creatingIn === id;
  const isEmpty = node.children.length === 0 && node.chats.length === 0 && !isCreating;
  const marked = clipboard?.kind === 'folder' && clipboard.id === id ? clipboard.mode : null;
  const isRenaming = renaming?.kind === 'folder' && renaming.id === id;
  const menuOpen = menu?.kind === 'folder' && menu.id === id;
  const pad = 8 + depth * 14;

  const onContextMenu = (e) => {
    e.preventDefault();
    openMenu({
      kind: 'folder',
      id,
      x: e.clientX,
      y: e.clientY,
      opener: e.currentTarget.querySelector('.tree-row')
    });
  };
  const onDots = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    openMenu({ kind: 'folder', id, x: r.left, y: r.bottom + 4, opener: e.currentTarget });
  };

  return (
    <div>
      <div
        className={`tree-item ${marked ? `is-${marked}` : ''}`}
        data-kind="folder"
        data-id={id}
        onContextMenu={onContextMenu}
      >
        {isRenaming ? (
          <div className="tree-row editing" style={{ paddingLeft: pad }}>
            <ChevronRight size={14} className="chev-r" />
            <Icon size={16} className="row-icon" />
            <RenameInput
              initial={node.folder.name}
              maxLength={80}
              onCommit={(v) => commitRename('folder', id, v)}
              onCancel={stopRename}
            />
          </div>
        ) : (
          <>
            <button
              type="button"
              className="tree-row"
              style={{ paddingLeft: pad }}
              aria-expanded={open}
              onClick={() => toggleFolder(id)}
            >
              <ChevronRight size={14} className={`chev-r ${open ? 'open' : ''}`} />
              <Icon size={16} className="row-icon" />
              <span className="row-label">{node.folder.name}</span>
              {node.count > 0 && <span className="row-count">{node.count}</span>}
            </button>
            <button
              type="button"
              className="row-menu-btn"
              aria-label={`Options for ${node.folder.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={onDots}
            >
              <MoreHorizontal size={16} />
            </button>
          </>
        )}
      </div>

      <div className={`children ${open ? 'open' : ''}`}>
        <div>
          {isCreating && (
            <NewFolderInput
              indent={8 + (depth + 1) * 14}
              onSubmit={(name) => finishCreateFolder(name, id)}
              onCancel={cancelCreateFolder}
            />
          )}
          {node.children.map((child) => (
            <FolderNode key={child.folder._id} node={child} depth={depth + 1} />
          ))}
          {node.chats.map((chat) => (
            <ChatRow key={chat.rootId} chat={chat} depth={depth + 1} />
          ))}
          {isEmpty && (
            <div className="tree-empty" style={{ paddingLeft: 8 + (depth + 1) * 14 + 20 }}>
              Empty
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FolderNode;