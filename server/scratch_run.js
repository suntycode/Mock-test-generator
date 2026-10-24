import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import Paper from './src/models/Paper.js';
import Question from './src/models/Question.js';
import { startPaperExtraction } from './src/services/extraction.service.js';

async function run() {
  await mongoose.connect(env.MONGO_URI);
  const paperId = '6ad9a4507c6a55c4bd72173e';

  // Clean slate for the paper
  await Question.deleteMany({ paperId });
  await Paper.updateOne(
    { _id: paperId },
    {
      $set: {
        status: 'uploaded',
        progress: { chunksTotal: 12, chunksDone: 0, failedChunks: [] },
        extractionStats: { found: 0, expected: 120, needsReview: 0, missingQNos: [] },
        error: ''
      }
    }
  );

  console.log('Reset paper and cleared existing questions. Starting extraction...');
  const res = await startPaperExtraction(paperId);
  console.log('Extraction initiated:', res);

  // Poll progress in loop until done
  while (true) {
    await new Promise((r) => setTimeout(r, 4000));
    const current = await Paper.findById(paperId).lean();
    console.log(`Status: ${current.status} | Chunks: ${current.progress?.chunksDone}/${current.progress?.chunksTotal} | Failed Chunks: [${current.progress?.failedChunks?.join(',')}] | Found: ${current.extractionStats?.found} | NeedsReview: ${current.extractionStats?.needsReview}`);
    if (['extracted', 'review', 'failed'].includes(current.status)) {
      console.log('\nFinal Paper State:');
      console.log(JSON.stringify({
        status: current.status,
        progress: current.progress,
        extractionStats: current.extractionStats,
        error: current.error
      }, null, 2));
      break;
    }
  }

  const finalQuestions = await Question.find({ paperId }).sort({ qNo: 1 }).lean();
  console.log(`\nTotal questions in DB: ${finalQuestions.length}`);
  
  // Section breakdown
  const sections = {};
  for (const q of finalQuestions) {
    sections[q.section] = (sections[q.section] || 0) + 1;
  }
  console.log('Section counts:', sections);

  const missing = [];
  const foundQNos = new Set(finalQuestions.map((q) => q.qNo));
  for (let i = 1; i <= 120; i++) {
    if (!foundQNos.has(i)) missing.push(i);
  }
  console.log('Missing question numbers:', missing);
  console.log('Needs review count:', finalQuestions.filter((q) => q.needsReview).length);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Run failed:', err);
  process.exit(1);
});

