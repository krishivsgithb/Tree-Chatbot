import { useRef, useState } from 'react';
import { FolderPlus } from 'lucide-react';

function NewFolderInput({ onSubmit, onCancel, indent = 8 }) {
  const [name, setName] = useState('');
  const cancelled = useRef(false);

  const finish = () => {
    if (cancelled.current) return;
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
    else onCancel();
  };

  return (
    <div className="new-folder" style={{ paddingLeft: indent }}>
      <FolderPlus size={16} className="row-icon" />
      <input
        autoFocus
        value={name}
        placeholder="Folder name"
        aria-label="Folder name"
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        onBlur={finish}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            cancelled.current = true;
            onCancel();
          }
        }}
      />
    </div>
  );
}

export default NewFolderInput;