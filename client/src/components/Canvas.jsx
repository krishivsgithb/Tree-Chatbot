import { ReactFlowProvider } from '@xyflow/react';
import CanvasFlow from './CanvasFlow';
import { ChainProvider } from '../context/ChainProvider';
import { useWorkspace } from '../hooks/useWorkspace';

function Canvas() {
  const { activeChat, activeRootId, status } = useWorkspace();

  if (!activeChat) {
    return <p>{status === 'ready' ? 'Select a chat, or create a new one.' : ''}</p>;
  }

  // key = rootId: opening another chat starts with fresh state
  return (
    <ReactFlowProvider>
      <ChainProvider key={activeRootId} rootId={activeRootId}>
        <CanvasFlow />
      </ChainProvider>
    </ReactFlowProvider>
  );
}

export default Canvas;