const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'model'], required: true },
    text: { type: String, required: true },
    model: { type: String }
}, { _id: false, timestamps: true });

const nodeSchema = new mongoose.Schema({
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Node', default: null, index: true },
  rootId: { type: mongoose.Schema.Types.ObjectId, ref: 'Node', index: true },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null, index: true },
  title: { type: String, default: 'Untitled chat', trim: true, maxlength: 120 },
  branchLabel: { type: String, default: '', trim: true, maxlength: 40 },
  provider: { type: String, default: 'gemini' },
  model: { type: String, default: '' },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  messages: [messageSchema]
}, { timestamps: true });

module.exports = mongoose.model('Node', nodeSchema);