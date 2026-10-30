import { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, ArrowUp, GitBranch, Lock, Sparkles, Square, Trash2 } from 'lucide-react';
import { PROVIDERS } from '../config/providers';
import { useChain } from '../hooks/useChain';

function ChatCard({ id, data, selected }) {
  const { nodes, send, stop, branch, rename, setDraft, requestDelete } = useChain();
  const scroller = useRef(null);
  const cancelled = useRef(false);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const cfg = PROVIDERS[data.provider];
  const Icon = cfg?.icon || Sparkles;
  const label = cfg?.label || data.provider;
  const parentTitle = data.parentId ? nodes.find((n) => n.id === data.parentId)?.data.title : null;
  const children = nodes.filter((n) => n.data.parentId === id).length;
  const thinking = data.status === 'thinking';
  const hasMessages = data.messages.length > 0;
  const canDelete = children === 0 && !thinking;

  // Keep the newest message in view
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data.messages.length, data.pending, data.status]);

  const startEdit = () => {
    cancelled.current = false;
    setTitleDraft(data.title);
    setEditing(true);
  };
  const commitTitle = () => {
    if (!cancelled.current) rename(id, titleDraft);
    setEditing(false);
  };

  const placeholder = thinking
    ? 'Waiting for response…'
    : data.status === 'error'
      ? 'Retry your message…'
      : hasMessages
        ? 'Ask a follow-up…'
        : 'Ask a question…';

  return (
    <div className={`chat-card ${selected ? 'selected' : ''}`}>
      {data.parentId && <Handle type="target" position={Position.Left} isConnectable={false} />}

      <div className="card-inner">
        <header className="card-head">
          {editing ? (
            <input
              className="title-input nodrag"
              autoFocus
              value={titleDraft}
              maxLength={120}
              aria-label="Chat title"
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  cancelled.current = true;
                  setEditing(false);
                }
              }}
            />
          ) : (
            <h4 className="card-title" onDoubleClick={startEdit} title="Double-click to rename">
              {data.title}
            </h4>
          )}
        </header>

        <div className="card-sub">
          <Icon size={13} className="accent" /> {label}
          <span className="sub-dot">·</span>
          {parentTitle ? `Branched from ${parentTitle}` : 'Root chat'}
        </div>

        <div className="card-messages nowheel nodrag" ref={scroller}>
          {!hasMessages && !data.pending && (
            <div className="card-empty">Ask something to start this branch.</div>
          )}

          {data.messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="bubble user">
                {m.text}
              </div>
            ) : (
              <div key={i} className="assistant">
                <div className="assistant-label">
                  <Icon size={12} /> ASSISTANT
                  {m.model && <span className="msg-model">· {m.model}</span>}
                </div>
                <div className="md">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              </div>
            )
          )}

          {data.pending && <div className="bubble user">{data.pending}</div>}

          {thinking && (
            <div className="thinking">
              thinking
              <span className="dots">
                <i />
                <i />
                <i />
              </span>
            </div>
          )}

          {data.status === 'error' && data.error && (
            <div className="card-error" role="alert">
              <div className="card-error-title">
                <AlertTriangle size={14} /> {data.error.title}
              </div>
              <p>{data.error.message}</p>
              <button type="button" className="link-btn danger" onClick={() => send(id)}>
                Retry message
              </button>
            </div>
          )}
        </div>

        <div className="card-input nodrag">
          <input
            value={data.draft}
            disabled={thinking}
            placeholder={placeholder}
            onChange={(e) => setDraft(id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(id);
            }}
          />
          {thinking ? (
            <button type="button" className="send stop" aria-label="Stop" onClick={() => stop(id)}>
              <Square size={11} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              className="send"
              aria-label="Send"
              disabled={!data.draft.trim()}
              onClick={() => send(id)}
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>

        <footer className="card-foot nodrag">
          <button
            type="button"
            className="foot-btn branch"
            disabled={!hasMessages || thinking}
            onClick={() => branch(id)}
          >
            <GitBranch size={15} /> Branch
          </button>
          {children > 0 && (
            <span className="foot-meta">
              {children} {children === 1 ? 'child' : 'children'}
            </span>
          )}
          <span className="grow" />
          <span className="delete-wrap">
            <button
              type="button"
              className="foot-btn danger"
              disabled={!canDelete}
              onClick={() => requestDelete(id)}
            >
              {canDelete ? <Trash2 size={14} /> : <Lock size={14} />} Delete
            </button>
            {children > 0 && (
              <span className="delete-note" role="tooltip">
                Delete child chats before deleting this chat.
              </span>
            )}
          </span>
        </footer>
      </div>

      {children > 0 && <Handle type="source" position={Position.Right} isConnectable={false} />}
    </div>
  );
}

export default ChatCard;