import mongoose from 'mongoose';

const tokenUsageSchema = new mongoose.Schema({
  paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', index: true },
  chunk: Number,
  callType: { type: String, enum: ['extract', 'tag', 'verify', 'generate', 'verify-generated'] },
  attempt: { type: Number, default: 1 },
  promptTokenCount: { type: Number, default: 0 },
  candidatesTokenCount: { type: Number, default: 0 },
  thoughtsTokenCount: { type: Number, default: 0 },
  totalTokenCount: { type: Number, default: 0 },
  model: String
}, { timestamps: true });

export default mongoose.model('TokenUsage', tokenUsageSchema);

