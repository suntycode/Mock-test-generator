import mongoose from 'mongoose';
import { z } from 'zod';
import ExamProfile from '../models/ExamProfile.js';
import Blueprint from '../models/Blueprint.js';
import Question from '../models/Question.js';
import Attempt from '../models/Attempt.js';
import MockTest from '../models/MockTest.js';
import { createAIQuestion } from './ai-generation.service.js';
import { getLatestBlueprint } from './analytics.service.js';
import { AppError } from '../utils/errors.js';

const generateSchema = z.object({
  examKey: z.string().min(1), mode: z.enum(['full', 'sectional', 'custom']), sections: z.array(z.union([z.string(), z.object({ name: z.string(), subcategories: z.array(z.object({ category: z.string(), subcategory: z.string(), count: z.number().int().positive() })) })])).optional(),
  difficultyMix: z.object({ easy: z.number().nonnegative(), medium: z.number().nonnegative(), hard: z.number().nonnegative() }).optional(), avoidSeen: z.boolean().default(true), useAI: z.boolean().default(false), title: z.string().optional()
}).strict();

function distribute(total, mix) {
  const keys = ['easy', 'medium', 'hard'];
  const sum = keys.reduce((value, key) => value + Number(mix[key] || 0), 0) || 1;
  const rows = keys.map((key, index) => {
    const exact = total * (Number(mix[key] || 0) / sum);
    return { key, count: Math.floor(exact), remainder: exact - Math.floor(exact), index };
  });
  let remaining = total - rows.reduce((sumCount, row) => sumCount + row.count, 0);
  rows.slice().sort((a, b) => b.remainder - a.remainder || a.index - b.index).slice(0, remaining).forEach((row) => { rows[row.index].count += 1; });
  return rows.map(({ key, count }) => [key, count]);
}

function normalizeDifficultyMix(mix) {
  const total = ['easy', 'medium', 'hard'].reduce((sum, key) => sum + Number(mix[key] || 0), 0);
  if (total <= 0) throw new AppError('VALIDATION_ERROR', 'difficultyMix must have a positive total.', 400);
  return Object.fromEntries(['easy', 'medium', 'hard'].map((key) => [key, Number(mix[key] || 0) / total]));
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}

async function pickQuestions({ examKey, section, category, subcategory, difficulty, count, used, seen, avoidSeen, warnings }) {
  const allAllowed = { examKey, origin: { $in: ['extracted', 'ai_generated'] } };
  const stages = [
    { label: 'same subcategory and difficulty', filter: { section, category, subcategory, difficulty, verified: true } },
    { label: 'same subcategory, any difficulty', filter: { section, category, subcategory, verified: true } },
    { label: 'same category, any difficulty', filter: { section, category, verified: true } },
    { label: 'same section, any category', filter: { section, verified: true } },
    // Fallback to unverified extracted questions if bank has few verified questions
    { label: 'same subcategory and difficulty (bank fallback)', filter: { section, category, subcategory, difficulty } },
    { label: 'same subcategory, any difficulty (bank fallback)', filter: { section, category, subcategory } },
    { label: 'same category, any difficulty (bank fallback)', filter: { section, category } },
    { label: 'same section, any category (bank fallback)', filter: { section } }
  ];
  const selected = [];
  for (const stage of stages) {
    if (selected.length >= count) break;
    const exclude = new Set([...used, ...(avoidSeen ? seen : [])]);
    let candidates = await Question.find({ ...allAllowed, ...stage.filter, _id: { $nin: [...exclude] } }).lean();
    candidates = shuffle(candidates);
    const take = candidates.slice(0, count - selected.length);
    if (take.length && stage.label !== 'same subcategory and difficulty') {
      warnings.push(`Filled ${take.length} ${section} question(s) using ${stage.label} for ${subcategory || category || 'section'}.`);
    }
    selected.push(...take);
    take.forEach((item) => used.add(String(item._id)));
  }
  return selected;
}

export async function generateMock(input) {
  const params = generateSchema.parse(input);
  const profile = await ExamProfile.findOne({ key: params.examKey }).lean();
  if (!profile) throw new AppError('EXAM_PROFILE_NOT_FOUND', `Unknown examKey: ${params.examKey}`, 404);
  let blueprint = await Blueprint.findOne({ examKey: params.examKey }).sort({ createdAt: -1 }).lean();
  if (!blueprint) {
    blueprint = await getLatestBlueprint(params.examKey);
  }
  const warnings = [];
  const used = new Set();
  const seen = new Set();
  if (params.avoidSeen) {
    const examMockIds = await MockTest.distinct('_id', { examKey: params.examKey });
    const previous = await Attempt.find({ mockTestId: { $in: examMockIds }, status: { $in: ['submitted', 'auto_submitted'] } }).select('responses.questionId').lean();
    previous.forEach((attempt) => attempt.responses.forEach((response) => seen.add(String(response.questionId))));
  }
  const mix = normalizeDifficultyMix(params.difficultyMix || blueprint?.difficultyMix || { easy: 0.3, medium: 0.5, hard: 0.2 });
  let sectionSpecs;
  if (params.mode === 'custom') {
    if (!Array.isArray(params.sections) || !params.sections.length || params.sections.some((item) => typeof item === 'string')) throw new AppError('VALIDATION_ERROR', 'Custom mode requires sections with category, subcategory, and count entries.', 400);
    if (params.sections.some((item) => !profile.sections.some((section) => section.name === item.name))) throw new AppError('VALIDATION_ERROR', 'Custom mode contains an unknown section.', 400);
    sectionSpecs = params.sections.map((section) => ({ name: section.name, leaves: section.subcategories.map((leaf) => ({ ...leaf, count: leaf.count })) }));
  } else {
    const selectedNames = params.mode === 'sectional' ? params.sections?.map((item) => typeof item === 'string' ? item : item.name) : null;
    if (params.mode === 'sectional' && (!selectedNames || selectedNames.length !== 1)) throw new AppError('VALIDATION_ERROR', 'Sectional mode requires exactly one section name.', 400);
    if (selectedNames && selectedNames.some((name) => !profile.sections.some((section) => section.name === name))) throw new AppError('VALIDATION_ERROR', 'Sectional mode contains an unknown section.', 400);
    sectionSpecs = profile.sections.slice().sort((a, b) => a.order - b.order).filter((section) => !selectedNames || selectedNames.includes(section.name)).map((section) => {
      const source = blueprint.sections.find((item) => item.name === section.name);
      return { name: section.name, leaves: (source?.categories || []).flatMap((category) => category.subcategories.map((subcategory) => ({ category: category.name, subcategory: subcategory.name, count: subcategory.count }))) };
    });
  }
  const snapshots = [];
  let order = 1;
  let totalQuestions = 0;
  for (const section of sectionSpecs) {
    for (const leaf of section.leaves) {
      const targets = distribute(leaf.count, mix);
      for (const [difficulty, count] of targets) {
        if (!count) continue;
        let selected = await pickQuestions({ examKey: params.examKey, section: section.name, category: leaf.category, subcategory: leaf.subcategory, difficulty, count, used, seen, avoidSeen: params.avoidSeen, warnings });
        if (selected.length < count) {
          let missing = count - selected.length;
          if (params.useAI && missing > 0) {
            while (missing > 0) {
              try {
                const request = { section: section.name, category: leaf.category, subcategory: leaf.subcategory, difficulty, language: 'hi' };
                const question = await createAIQuestion({ examKey: params.examKey, ...request });
                selected.push(question.toObject());
                used.add(String(question._id));
                missing -= 1;
              } catch {
                warnings.push(`AI generation or independent verification failed for ${section.name} / ${leaf.subcategory} / ${difficulty}; no unverified answer was accepted.`);
                break;
              }
            }
          }
          if (selected.length < count) warnings.push(`Only ${selected.length} of ${count} requested question(s) available in ${section.name} / ${leaf.subcategory} / ${difficulty}.`);
        }
        selected.forEach((question) => { snapshots.push({ questionId: question._id, section: section.name, order: order++ }); });
        totalQuestions += selected.length;
      }
    }
  }
  if (!snapshots.length) throw new AppError('QUESTION_BANK_EMPTY', 'No verified questions match this mock test.', 409);
  const selectedProfileSections = profile.sections.filter((item) => sectionSpecs.some((section) => section.name === item.name));
  const durationMinutes = params.mode === 'full' ? profile.durationMinutes : params.mode === 'sectional'
    ? Math.round((selectedProfileSections[0].questions / profile.totalQuestions) * profile.durationMinutes)
    : Math.ceil(totalQuestions * 45 / 60);
  const mock = await MockTest.create({ examKey: params.examKey, title: params.title || `${params.mode[0].toUpperCase()}${params.mode.slice(1)} mock`, mode: params.mode, durationMinutes, blueprintId: blueprint?._id, questions: snapshots, difficultyMix: mix });
  return { mockTest: mock, warnings, requestedQuestions: params.mode === 'full' ? profile.totalQuestions : params.mode === 'sectional' ? selectedProfileSections[0].questions : totalQuestions };
}

export async function generateWeakAreaPractice(attemptId) {
  if (!mongoose.isValidObjectId(attemptId)) throw new AppError('INVALID_ATTEMPT_ID', 'Attempt id is invalid.', 400);
  const attempt = await Attempt.findById(attemptId).lean();
  if (!attempt || !attempt.result) throw new AppError('ATTEMPT_RESULT_NOT_FOUND', 'Submit an attempt before generating weak-area practice.', 409);
  const weakest = [...attempt.result.subcategories].filter((item) => item.total > 0).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
  if (!weakest.length) throw new AppError('NO_WEAK_AREAS', 'This result has no weak areas to practice.', 409);
  const sections = [];
  for (const area of weakest) {
    let section = sections.find((item) => item.name === area.section);
    if (!section) { section = { name: area.section, subcategories: [] }; sections.push(section); }
    section.subcategories.push({ category: area.category, subcategory: area.subcategory, count: 5 });
  }
  return generateMock({ examKey: (await MockTest.findById(attempt.mockTestId).select('examKey').lean()).examKey, mode: 'custom', sections, avoidSeen: false, useAI: true, title: 'Weak-area practice' });
}

export async function listMockTests() { return MockTest.find().sort({ createdAt: -1 }).lean(); }

export async function getMockTest(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('INVALID_MOCKTEST_ID', 'Mock test id is invalid.', 400);
  const mock = await MockTest.findById(id).lean();
  if (!mock) throw new AppError('MOCKTEST_NOT_FOUND', 'Mock test was not found.', 404);
  return mock;
}
