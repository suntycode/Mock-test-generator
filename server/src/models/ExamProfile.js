import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  questions: { type: Number, required: true },
  order: { type: Number, required: true }
}, { _id: false });

const examProfileSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  durationMinutes: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  marking: {
    correct: { type: Number, required: true },
    wrong: { type: Number, required: true },
    unattempted: { type: Number, required: true }
  },
  sections: { type: [sectionSchema], required: true },
  sectionLock: { type: Boolean, required: true },
  optionsPerQuestion: { type: Number, required: true },
  languages: { type: [String], required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ExamProfile', examProfileSchema);
