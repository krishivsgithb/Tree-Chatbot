const Node = require('../models/Node');
const Folder = require('../models/Folder');

// Given a list of root node IDs, returns those IDs plus every descendant node ID
async function getTreeIds(rootIds) {
  let allIds = [...rootIds];
  let frontier = [...rootIds];

  while (frontier.length > 0) {
    const children = await Node.find({ parentId: { $in: frontier } }).select('_id');
    frontier = children.map((c) => c._id);
    allIds = allIds.concat(frontier);
  }

  return allIds;
}

// Given a folder ID, returns that ID plus every subfolder ID below it
async function getFolderTreeIds(folderId) {
  let allIds = [folderId];
  let frontier = [folderId];

  while (frontier.length > 0) {
    const children = await Folder.find({ parentFolderId: { $in: frontier } }).select('_id');
    frontier = children.map((c) => c._id);
    allIds = allIds.concat(frontier);
  }

  return allIds;
}

module.exports = { getTreeIds, getFolderTreeIds };