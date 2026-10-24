import mongoose from 'mongoose';

const questionSnapshotSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  section: { type: String, required: true },
  order: { type: Number, required: true }
}, { _id: false });

const mockTestSchema = new mongoose.Schema({
  examKey: { type: String, required: true },
  title: String,
  mode: { type: String, enum: ['full', 'sectional', 'custom'], required: true },
  durationMinutes: Number,
  blueprintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Blueprint' },
  questions: [questionSnapshotSchema],
  difficultyMix: { easy: Number, medium: Number, hard: Number },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('MockTest', mockTestSchema);
