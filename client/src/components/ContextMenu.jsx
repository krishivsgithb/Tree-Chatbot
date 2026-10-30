import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardPaste,
  Copy,
  FilePlus2,
  FolderPlus,
  Pencil,
  Scissors,
  Trash2
} from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { useOnClickOutside } from '../hooks/useOnClickOutside';

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);
const MOD = IS_MAC ? '⌘' : 'Ctrl+';
const SEP = { separator: true };

function buildMenu(ws, menu) {
  const { kind, id } = menu;

  if (kind === 'root') {
    return {
      title: 'WORKSPACE',
      items: [
        { label: 'Paste here', icon: ClipboardPaste, hint: `${MOD}V`, disabled: !ws.canPaste(null), run: () => ws.paste(null) },
        SEP,
        { label: 'New chat', icon: FilePlus2, run: () => ws.newChat(null) },
        { label: 'New folder', icon: FolderPlus, run: () => ws.startCreateFolder('root') }
      ]
    };
  }

  if (kind === 'folder') {
    const folder = ws.folders.find((f) => f._id === id);
    if (!folder) return null;
    return {
      title: folder.name.toUpperCase(),
      items: [
        { label: 'New chat here', icon: FilePlus2, run: () => ws.newChat(id) },
        { label: 'New subfolder', icon: FolderPlus, run: () => ws.startCreateFolder(id) },
        SEP,
        { label: 'Cut', icon: Scissors, hint: `${MOD}X`, run: () => ws.cut('folder', id) },
        { label: 'Copy', icon: Copy, hint: `${MOD}C`, run: () => ws.copy('folder', id) },
        { label: 'Paste', icon: ClipboardPaste, hint: `${MOD}V`, disabled: !ws.canPaste(id), run: () => ws.paste(id) },
        SEP,
        { label: 'Rename', icon: Pencil, hint: 'F2', run: () => ws.startRename('folder', id) },
        { label: 'Delete', icon: Trash2, hint: 'Del', danger: true, run: () => ws.requestDelete('folder', id) }
      ]
    };
  }

  const chat = ws.chats.find((c) => c.rootId === id);
  if (!chat) return null;
  return {
    title: chat.title.toUpperCase(),
    items: [
      { label: 'Cut', icon: Scissors, hint: `${MOD}X`, run: () => ws.cut('chat', id) },
      { label: 'Copy', icon: Copy, hint: `${MOD}C`, run: () => ws.copy('chat', id) },
      SEP,
      { label: 'Rename', icon: Pencil, hint: 'F2', run: () => ws.startRename('chat', id) },
      { label: 'Delete', icon: Trash2, hint: 'Del', danger: true, run: () => ws.requestDelete('chat', id) }
    ]
  };
}

function ContextMenu() {
  const ws = useWorkspace();
  const { menu, closeMenu } = ws;
  const ref = useRef(null);

  useOnClickOutside(ref, closeMenu, Boolean(menu));

  // Keep the menu on screen, then focus its first enabled item
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !menu) return;
    const r = el.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(menu.x, window.innerWidth - r.width - 8))}px`;
    el.style.top = `${Math.max(8, Math.min(menu.y, window.innerHeight - r.height - 8))}px`;
    el.querySelector('button:not(:disabled)')?.focus();
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    window.addEventListener('resize', closeMenu);
    window.addEventListener('blur', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('blur', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [menu, closeMenu]);

  if (!menu) return null;
  const built = buildMenu(ws, menu);
  if (!built) return null;

  const onKeyDown = (e) => {
    const items = [...ref.current.querySelectorAll('button:not(:disabled)')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      menu.opener?.focus?.();
    } else if (e.key === 'Tab') {
      e.preventDefault();
    }
  };

  return createPortal(
    <div
      ref={ref}
      className="ctx-menu"
      role="menu"
      style={{ left: menu.x, top: menu.y }}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="ctx-title">{built.title}</div>
      {built.items.map((item, i) => {
        if (item.separator) return <div key={i} className="ctx-sep" role="separator" />;
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            className={`ctx-item ${item.danger ? 'danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              closeMenu();
              item.run();
            }}
          >
            <Icon size={15} />
            <span>{item.label}</span>
            {item.hint && <span className="ctx-hint">{item.hint}</span>}
          </button>
        );
      })}
    </div>,
    document.body
  );
}

export default ContextMenu;