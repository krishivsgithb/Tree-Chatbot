import { useRef, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import { useChain } from '../hooks/useChain';

function LabeledEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}) {
  const { setLabel } = useChain();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const cancelled = useRef(false);

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const label = data?.label || '';

  const start = () => {
    cancelled.current = false;
    setDraft(label);
    setEditing(true);
  };
  const commit = () => {
    if (!cancelled.current) setLabel(data.targetId, draft);
    setEditing(false);
  };

  return (
    <>
      <BaseEdge path={path} />
      <EdgeLabelRenderer>
        <div
          className="edge-label nodrag nopan"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {editing ? (
            <input
              className="edge-input"
              autoFocus
              value={draft}
              maxLength={40}
              aria-label="Branch label"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  cancelled.current = true;
                  setEditing(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              className={`edge-pill ${label ? '' : 'empty'}`}
              onDoubleClick={start}
              onClick={label ? undefined : start}
              title="Double-click to edit the label"
            >
              {label || '+'}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default LabeledEdge;