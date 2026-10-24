import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema({ name: String, count: Number }, { _id: false });
const categorySchema = new mongoose.Schema({ name: String, count: Number, subcategories: [subcategorySchema] }, { _id: false });
const sectionSchema = new mongoose.Schema({ name: String, total: Number, categories: [categorySchema] }, { _id: false });

const blueprintSchema = new mongoose.Schema({
  examKey: { type: String, required: true },
  basedOnPapers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Paper' }],
  sections: [sectionSchema],
  difficultyMix: { easy: Number, medium: Number, hard: Number },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Blueprint', blueprintSchema);
