import { useRef } from 'react';

function RenameInput({ initial, onCommit, onCancel, maxLength = 120 }) {
  const cancelled = useRef(false);

  return (
    <input
      className="rename-input"
      autoFocus
      defaultValue={initial}
      maxLength={maxLength}
      aria-label="Rename"
      onFocus={(e) => e.target.select()}
      onBlur={(e) => {
        if (!cancelled.current) onCommit(e.currentTarget.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          cancelled.current = true;
          onCancel();
        }
      }}
    />
  );
}

export default RenameInput;