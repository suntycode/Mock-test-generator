import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  chosen: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
  status: { type: String, enum: ['not_visited', 'not_answered', 'answered', 'marked', 'answered_marked'], required: true },
  timeSpentSec: { type: Number, default: 0 },
  lastUpdated: Date
}, { _id: false });

const sectionResultSchema = new mongoose.Schema({ name: String, score: Number, correct: Number, wrong: Number, unattempted: Number, timeSec: Number }, { _id: false });
const subcategoryResultSchema = new mongoose.Schema({ section: String, category: String, subcategory: String, correct: Number, wrong: Number, total: Number, accuracy: Number }, { _id: false });

const attemptSchema = new mongoose.Schema({
  mockTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'MockTest', required: true },
  startedAt: Date,
  endsAt: Date,
  submittedAt: Date,
  status: { type: String, enum: ['in_progress', 'submitted', 'auto_submitted'], default: 'in_progress' },
  responses: [responseSchema],
  result: {
    score: Number,
    correct: Number,
    wrong: Number,
    unattempted: Number,
    accuracy: Number,
    sections: [sectionResultSchema],
    subcategories: [subcategoryResultSchema]
  }
});

export default mongoose.model('Attempt', attemptSchema);
