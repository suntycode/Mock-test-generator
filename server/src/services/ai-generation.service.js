import { z } from 'zod';
import Question from '../models/Question.js';
import { generateQuestion, solveGeneratedQuestion } from './gemini.service.js';
import { AppError } from '../utils/errors.js';

const requestSchema = z.object({
  examKey: z.string().min(1).default('rrb-ntpc-ug-cbt2'),
  section: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  language: z.enum(['hi', 'en', 'bilingual']).default('hi'),
  autoApprove: z.boolean().optional().default(false)
});
let qNoAllocationQueue = Promise.resolve();

async function storeGeneratedQuestion(request, generated, checked, autoApprove = false) {
  const previousAllocation = qNoAllocationQueue;
  let releaseAllocation;
  qNoAllocationQueue = new Promise((resolve) => { releaseAllocation = resolve; });
  await previousAllocation;
  try {
    const last = await Question.findOne({ examKey: request.examKey }).sort({ qNo: -1 }).select('qNo').lean();
    const qNo = (last?.qNo || 0) + 1;
    const verified = Boolean(autoApprove);
    const needsReview = !verified;
    const reviewReasons = verified ? [] : ['AI-generated — verify before use'];

    return await Question.create({
      examKey: request.examKey,
      qNo,
      section: request.section,
      category: request.category,
      subcategory: request.subcategory,
      difficulty: generated.difficulty || request.difficulty,
      difficultySource: 'ai',
      language: generated.language || request.language,
      text: generated.question_text,
      options: generated.options,
      correctOption: generated.correct_option,
      explanation: checked.explanation || '',
      hasFigure: false,
      confidence: 0.95,
      needsReview,
      reviewReasons,
      origin: 'ai_generated',
      verified,
      stats: { attempts: 0, correct: 0, avgTimeSec: 0 }
    });
  } finally { releaseAllocation(); }
}

export async function createAIQuestion(input) {
  const request = requestSchema.parse(input);
  let generated;
  let checked;
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts += 1;
    generated = await generateQuestion(request);
    checked = await solveGeneratedQuestion(generated);
    if (checked.correct_option && checked.correct_option === generated.correct_option) {
      break;
    }
    if (attempts >= maxAttempts) {
      throw new AppError('AI_ANSWER_MISMATCH', 'The independent answer check disagreed; the question was discarded.', 422);
    }
  }

  return storeGeneratedQuestion(request, generated, checked, request.autoApprove);
}

export async function generateMoreQuestions(input) {
  const count = z.number().int().min(1).max(20).parse(input.count ?? 1);
  const { count: _count, ...request } = input;
  const results = [];
  const errors = [];

  for (let index = 0; index < count; index += 1) {
    try {
      const q = await createAIQuestion(request);
      results.push(q);
    } catch (err) {
      errors.push(err.message || 'Generation failed');
    }
  }

  if (results.length === 0 && errors.length > 0) {
    throw new AppError('AI_GENERATION_FAILED', `Failed to generate questions: ${errors[0]}`, 422);
  }

  return results;
}
