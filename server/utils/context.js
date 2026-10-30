const Node = require('../models/Node');

// Returns the list of nodes from root → ... → this node
async function getAncestorChain(node) {
  const chain = [node];

  let current = node;
  while (current.parentId) {
    current = await Node.findById(current.parentId);
    chain.push(current);
  }

  chain.reverse();
  return chain;
}

// Flattens all those nodes' messages into one array (this is what goes to Gemini)
async function getFullContext(node) {
  const chain = await getAncestorChain(node);

  let fullMessages = [];
  for (const n of chain) {
    fullMessages = fullMessages.concat(n.messages);
  }

  return fullMessages;
}

module.exports = { getAncestorChain, getFullContext };