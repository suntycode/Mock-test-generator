import mongoose from 'mongoose';

const paperSchema = new mongoose.Schema({
  examKey: { type: String, required: true },
  title: { type: String, required: true },
  examDate: Date,
  shift: String,
  originalFilename: String,
  pdfPath: String,
  totalPages: Number,
  status: { type: String, enum: ['uploaded', 'extracting', 'extracted', 'review', 'approved', 'failed'], default: 'uploaded' },
  progress: {
    chunksTotal: Number,
    chunksDone: Number,
    extractedChunks: [Number],
    failedChunks: [Number],
    activeChunks: [Number],
    retryPagesTotal: Number,
    retryPagesDone: Number
  },
  extractionStats: { found: Number, expected: Number, needsReview: Number, missingQNos: [Number] },
  error: String
}, { timestamps: true });

export default mongoose.model('Paper', paperSchema);
