import { useState } from 'react';
import {
  Background,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  useViewport
} from '@xyflow/react';
import { CloudOff, Hand, Maximize2, Minus, MousePointer2, Plus } from 'lucide-react';
import ChatCard from './ChatCard';
import LabeledEdge from './LabeledEdge';
import DeleteConfirm from './DeleteConfirm';
import ErrorBanner from './ErrorBanner';
import { useChain } from '../hooks/useChain';
import { useWorkspace } from '../hooks/useWorkspace';
import { folderTrail } from '../utils/workspaceTree';

// Defined outside the component so React Flow doesn't rebuild them every render
const nodeTypes = { chat: ChatCard };
const edgeTypes = { labeled: LabeledEdge };

function CanvasToolbar({ tool, setTool }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();

  return (
    <Panel position="bottom-left" className="canvas-toolbar">
      <button
        type="button"
        className={tool === 'select' ? 'on' : ''}
        aria-label="Select tool"
        title="Select and move cards"
        onClick={() => setTool('select')}
      >
        <MousePointer2 size={16} />
      </button>
      <button
        type="button"
        className={tool === 'hand' ? 'on' : ''}
        aria-label="Hand tool"
        title="Pan the canvas"
        onClick={() => setTool('hand')}
      >
        <Hand size={16} />
      </button>
      <span className="tb-sep" />
      <button type="button" aria-label="Zoom out" onClick={() => zoomOut({ duration: 150 })}>
        <Minus size={16} />
      </button>
      <span className="tb-zoom">{Math.round(zoom * 100)}%</span>
      <button type="button" aria-label="Zoom in" onClick={() => zoomIn({ duration: 150 })}>
        <Plus size={16} />
      </button>
      <button
        type="button"
        aria-label="Fit to screen"
        onClick={() => fitView({ padding: 0.25, maxZoom: 1, duration: 300 })}
      >
        <Maximize2 size={16} />
      </button>
    </Panel>
  );
}

function CanvasFlow() {
  const {
    nodes,
    edges,
    status,
    loadError,
    retry,
    saves,
    onNodesChange,
    savePosition
  } = useChain();
  const { folders, activeChat } = useWorkspace();
  const [tool, setTool] = useState('select');

  if (status === 'loading') {
    return <div className="canvas-wrap canvas-msg">Loading chat…</div>;
  }
  if (status === 'error') {
    return (
      <div className="canvas-wrap canvas-msg">
        <p>Couldn’t load this chat: {loadError}</p>
        <button type="button" className="btn btn-outline" onClick={retry}>
          Retry
        </button>
      </div>
    );
  }

  const trail = folderTrail(folders, activeChat?.folderId);

  return (
    <div className={`canvas-wrap tool-${tool}`}>
      <div className="canvas-head">
        <div className="crumbs">
          {trail.length ? trail.join(' / ') : 'No folder'} <span>›</span> Chat chain
        </div>
        <h2>{activeChat?.title}</h2>
      </div>

      <div className={`save-state ${saves.failed ? 'failed' : ''}`}>
        {saves.failed ? (
          <>
            <CloudOff size={13} /> Couldn’t save changes
          </>
        ) : saves.inflight > 0 ? (
          'Saving…'
        ) : (
          <>
            <span className="dot-ok" /> All changes saved
          </>
        )}
      </div>

      <ErrorBanner />

      <ReactFlow
        className="rf-canvas"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={(_, node) => savePosition(node.id, node.position)}
        nodesDraggable={tool === 'select'}
        nodesConnectable={false}
        edgesFocusable={false}
        deleteKeyCode={null}
        panActivationKeyCode="Space"
        minZoom={0.2}
        maxZoom={1.5}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        attributionPosition="bottom-right"
      >
        <Background gap={22} size={1} color="var(--dots)" />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={0}
          nodeColor={(n) => (n.selected ? 'var(--accent)' : 'var(--text-muted)')}
          style={{ marginBottom: 30 }}
        />
        <CanvasToolbar tool={tool} setTool={setTool} />
        <Panel position="bottom-center" className="canvas-hint">
          Scroll to zoom · Space + drag to pan
        </Panel>
      </ReactFlow>

      <DeleteConfirm />
    </div>
  );
}

export default CanvasFlow;