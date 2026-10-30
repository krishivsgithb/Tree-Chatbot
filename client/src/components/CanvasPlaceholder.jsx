import { useWorkspace } from '../hooks/useWorkspace';

function CanvasPlaceholder() {
  const { activeChat } = useWorkspace();

  if (!activeChat) {
    return <p>Select a chat, or create a new one.</p>;
  }

  return (
    <div className="placeholder">
      <h2>{activeChat.title}</h2>
      <p>
        {activeChat.nodeCount} card{activeChat.nodeCount === 1 ? '' : 's'}. The canvas comes in
        the next step.
      </p>
    </div>
  );
}

export default CanvasPlaceholder;