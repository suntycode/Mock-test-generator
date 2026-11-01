import mongoose from 'mongoose';
import { z } from 'zod';
import Question from '../models/Question.js';
import Paper from '../models/Paper.js';
import Attempt from '../models/Attempt.js';
import { tagQuestionBatch } from './gemini.service.js';
import { loadTaxonomy, normalizeTags } from './taxonomy.service.js';
import { AppError } from '../utils/errors.js';

const updateSchema = z.object({
  section: z.string().min(1).optional(), category: z.string().min(1).optional(), subcategory: z.string().min(1).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(), difficultySource: z.enum(['ai', 'calibrated', 'manual']).optional(),
  language: z.enum(['hi', 'en', 'bilingual']).optional(), text: z.string().min(1).optional(),
  options: z.object({ A: z.string(), B: z.string(), C: z.string(), D: z.string() }).optional(),
  correctOption: z.enum(['A', 'B', 'C', 'D']).nullable().optional(), explanation: z.string().optional(),
  hasFigure: z.boolean().optional(), figurePath: z.string().optional(), sourcePage: z.number().int().positive().optional(),
  needsReview: z.boolean().optional(), reviewReasons: z.array(z.string()).optional(), verified: z.boolean().optional()
}).strict();
const listQuerySchema = z.object({
  paperId: z.string().optional(), section: z.string().optional(), category: z.string().optional(), subcategory: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(), origin: z.enum(['extracted', 'ai_generated']).optional(),
  verified: z.enum(['true', 'false']).optional(), needsReview: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(100).default(25)
}).passthrough();

function validId(id, label) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('INVALID_ID', `${label} id is invalid.`, 400);
}

async function redactAnswersDuringAttempts(questions) {
  if (!questions.length) return questions;
  const anyActiveAttempt = await Attempt.exists({ status: 'in_progress' });
  return questions.map((question) => {
    const result = typeof question.toObject === 'function' ? question.toObject() : { ...question };
    if (anyActiveAttempt) { delete result.correctOption; delete result.explanation; }
    return result;
  });
}

export { redactAnswersDuringAttempts };

export async function listQuestions(query) {
  const parsed = listQuerySchema.parse(query);
  const { page, limit } = parsed;
  const filter = {};
  for (const key of ['paperId', 'section', 'category', 'subcategory', 'difficulty', 'origin']) {
    if (parsed[key] !== undefined && parsed[key] !== '') filter[key] = parsed[key];
  }
  if (parsed.verified !== undefined) filter.verified = parsed.verified === 'true';
  if (parsed.needsReview !== undefined) filter.needsReview = parsed.needsReview === 'true';
  if (filter.paperId) validId(filter.paperId, 'Paper');
  const [items, total] = await Promise.all([
    Question.find(filter).sort({ qNo: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Question.countDocuments(filter)
  ]);
  return { items: await redactAnswersDuringAttempts(items), page, limit, total, pages: Math.ceil(total / limit) };
}

export async function getQuestion(id) {
  validId(id, 'Question');
  const question = await Question.findById(id).lean();
  if (!question) throw new AppError('QUESTION_NOT_FOUND', 'Question was not found.', 404);
  return (await redactAnswersDuringAttempts([question]))[0];
}

export async function updateQuestion(id, input) {
  validId(id, 'Question');
  const changes = updateSchema.parse(input);
  const question = await Question.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true });
  if (!question) throw new AppError('QUESTION_NOT_FOUND', 'Question was not found.', 404);
  return (await redactAnswersDuringAttempts([question]))[0];
}

export async function retagQuestion(id) {
  validId(id, 'Question');
  const question = await Question.findById(id);
  if (!question) throw new AppError('QUESTION_NOT_FOUND', 'Question was not found.', 404);
  const taxonomy = await loadTaxonomy();
  const raw = { qNo: question.qNo, section: question.section, text: question.text, options: question.options, correctOption: question.correctOption, language: question.language };
  
  let tag = null;
  try {
    const results = await tagQuestionBatch([raw], taxonomy);
    tag = results?.[0] || null;
  } catch (err) {
    throw new AppError('RETAG_FAILED', `Retagging failed across all AI providers: ${err.message}`, 502);
  }

  if (!tag) {
    throw new AppError('RETAG_EMPTY', 'AI returned an empty tagging result.', 502);
  }

  const normalized = normalizeTags(tag, taxonomy);
  const reasons = new Set((question.reviewReasons || []).filter((reason) => reason !== 'unknown tag' && reason !== 'answer mismatch' && reason !== 'tagging failed'));
  if (normalized.needsReview) reasons.add('unknown tag');
  if (tag?.answer_check?.mismatch) reasons.add('answer mismatch');
  question.section = normalized.section || question.section;
  question.category = normalized.category || 'Other';
  question.subcategory = normalized.subcategory || 'Other';
  question.difficulty = tag.difficulty || 'medium';
  question.difficultySource = 'ai';
  question.explanation = tag.explanation || '';
  question.reviewReasons = [...reasons];
  question.needsReview = question.reviewReasons.length > 0;
  await question.save();
  return (await redactAnswersDuringAttempts([question]))[0];
}

export async function approvePaper(id) {
  validId(id, 'Paper');
  const paper = await Paper.findById(id);
  if (!paper) throw new AppError('PAPER_NOT_FOUND', 'Paper was not found.', 404);
  const result = await Question.updateMany({ paperId: paper._id, needsReview: { $ne: true } }, { $set: { verified: true } });
  paper.status = 'approved';
  await paper.save();
  return { paper, approvedCount: result.modifiedCount };
}

export async function deleteQuestion(id) {
  validId(id, 'Question');
  const question = await Question.findByIdAndDelete(id);
  if (!question) throw new AppError('QUESTION_NOT_FOUND', 'Question was not found.', 404);
  return { deleted: true, questionId: id };
}
