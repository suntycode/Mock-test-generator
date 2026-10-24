import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper' },
  examKey: { type: String, required: true },
  qNo: { type: Number, required: true },
  section: { type: String, required: true },
  category: String,
  subcategory: String,
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
  difficultySource: { type: String, enum: ['ai', 'calibrated', 'manual'] },
  language: { type: String, enum: ['hi', 'en', 'bilingual'] },
  text: String,
  options: { A: String, B: String, C: String, D: String },
  correctOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
  explanation: String,
  hasFigure: Boolean,
  figurePath: String,
  sourcePage: Number,
  confidence: { type: Number, min: 0, max: 1 },
  needsReview: Boolean,
  reviewReasons: [String],
  origin: { type: String, enum: ['extracted', 'ai_generated'] },
  verified: Boolean,
  stats: { attempts: Number, correct: Number, avgTimeSec: Number }
}, { timestamps: { createdAt: true, updatedAt: false } });

questionSchema.index({ examKey: 1, section: 1, category: 1, subcategory: 1, difficulty: 1, verified: 1 });
questionSchema.index({ paperId: 1, qNo: 1 }, { unique: true });

export default mongoose.model('Question', questionSchema);
