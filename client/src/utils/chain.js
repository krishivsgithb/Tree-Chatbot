// Server node -> React Flow node
export function toFlowNode(n) {
  return {
    id: n.nodeId,
    type: 'chat',
    position: n.position,
    data: {
      parentId: n.parentId,
      title: n.title,
      branchLabel: n.branchLabel,
      provider: n.provider,
      model: n.model,
      messages: n.messages,
      draft: '',
      pending: null,
      status: 'idle', // idle | thinking | error
      error: null
    }
  };
}

// Lines between cards, derived from each card's parent
export function buildEdges(nodes) {
  return nodes
    .filter((n) => n.data.parentId)
    .map((n) => ({
      id: `e-${n.data.parentId}-${n.id}`,
      source: n.data.parentId,
      target: n.id,
      type: 'labeled',
      animated: n.data.status === 'thinking',
      selectable: false,
      data: { label: n.data.branchLabel, targetId: n.id }
    }));
}

const HINT = 'Switch the provider in the top bar, then retry.';

export function describeError(e, label) {
  if (e.offline) {
    return {
      title: 'Server unreachable',
      message: 'Could not reach the server. Is the backend running? Your message is still in the box.'
    };
  }
  switch (e.status) {
    case 503:
    case 529:
      return {
        title: 'Model overloaded',
        message: `${label} is busy. Your conversation is safe. Try again in a moment. ${HINT}`
      };
    case 429:
      return { title: 'Rate limit reached', message: `${e.message} ${HINT}` };
    case 402:
      return { title: 'Billing problem', message: `${e.message} ${HINT}` };
    case 504:
      return { title: 'Took too long', message: `${label} didn’t answer in time. Try again.` };
    case 502:
      return { title: 'Connection problem', message: 'Could not reach the provider. Check your connection.' };
    case 404:
      return { title: 'Model not found', message: 'Check the model name in the top bar, then retry.' };
    default:
      return { title: 'Something went wrong', message: e.message };
  }
}