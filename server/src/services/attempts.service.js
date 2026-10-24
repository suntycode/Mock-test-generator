import mongoose from 'mongoose';
import { z } from 'zod';
import Attempt from '../models/Attempt.js';
import MockTest from '../models/MockTest.js';
import Question from '../models/Question.js';
import ExamProfile from '../models/ExamProfile.js';
import { AppError } from '../utils/errors.js';
import { updateQuestionDifficultyStats } from './difficulty.service.js';

const createSchema = z.object({ mockTestId: z.string().refine(mongoose.isValidObjectId, 'Invalid mockTestId.') }).strict();
const answerSchema = z.object({
  questionId: z.string().refine(mongoose.isValidObjectId, 'Invalid questionId.'),
  chosen: z.enum(['A', 'B', 'C', 'D']).nullable(),
  status: z.enum(['not_visited', 'not_answered', 'answered', 'marked', 'answered_marked']),
  timeSpentSec: z.number().nonnegative()
}).strict().superRefine((answer, context) => {
  const needsChoice = ['answered', 'answered_marked'].includes(answer.status);
  if (needsChoice && !answer.chosen) context.addIssue({ code: z.ZodIssueCode.custom, path: ['chosen'], message: 'A chosen option is required for answered states.' });
  if (!needsChoice && answer.chosen !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['chosen'], message: 'A chosen option is only allowed in answered states.' });
});

function safeQuestion(question, snapshot) {
  if (!question) return null;
  return { _id: question._id, paperId: question.paperId, qNo: question.qNo, section: snapshot.section, order: snapshot.order, text: question.text, options: question.options, hasFigure: question.hasFigure, sourcePage: question.sourcePage, language: question.language, category: question.category, subcategory: question.subcategory };
}

async function loadPublicAttempt(attempt) {
  const mock = await MockTest.findById(attempt.mockTestId).lean();
  const ids = mock.questions.map((entry) => entry.questionId);
  const questions = await Question.find({ _id: { $in: ids } }).lean();
  const byId = new Map(questions.map((question) => [String(question._id), question]));
  return { attemptId: String(attempt._id), mockTestId: String(mock._id), title: mock.title, durationMinutes: mock.durationMinutes, status: attempt.status,
    endsAt: attempt.endsAt, serverNow: new Date(), responses: attempt.responses,
    questions: mock.questions.map((snapshot) => safeQuestion(byId.get(String(snapshot.questionId)), snapshot)).filter(Boolean), result: attempt.status === 'in_progress' ? undefined : attempt.result };
}

export async function createAttempt(input) {
  const { mockTestId } = createSchema.parse(input);
  const mock = await MockTest.findById(mockTestId).lean();
  if (!mock) throw new AppError('MOCKTEST_NOT_FOUND', 'Mock test was not found.', 404);
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + mock.durationMinutes * 60_000);
  const responses = mock.questions.map((question) => ({ questionId: question.questionId, chosen: null, status: 'not_visited', timeSpentSec: 0, lastUpdated: startedAt }));
  const attempt = await Attempt.create({ mockTestId, startedAt, endsAt, status: 'in_progress', responses });
  return loadPublicAttempt(attempt);
}

async function calculateResult(attempt, status) {
  const mock = await MockTest.findById(attempt.mockTestId).lean();
  const profile = await ExamProfile.findOne({ key: mock.examKey }).lean();
  const ids = mock.questions.map((question) => question.questionId);
  const questions = await Question.find({ _id: { $in: ids } }).lean();
  const byId = new Map(questions.map((question) => [String(question._id), question]));
  const responseById = new Map(attempt.responses.map((response) => [String(response.questionId), response]));
  const sections = new Map();
  const subcategories = new Map();
  let correct = 0; let wrong = 0; let unattempted = 0;
  for (const snapshot of mock.questions) {
    const question = byId.get(String(snapshot.questionId));
    const response = responseById.get(String(snapshot.questionId));
    const section = sections.get(snapshot.section) || { name: snapshot.section, score: 0, correct: 0, wrong: 0, unattempted: 0, timeSec: 0 };
    section.timeSec += response?.timeSpentSec || 0;
    let isCorrect = false; let isWrong = false;
    if (response?.chosen && question?.correctOption) {
      isCorrect = response.chosen === question.correctOption;
      isWrong = !isCorrect;
      if (isCorrect) { correct += 1; section.correct += 1; section.score += profile.marking.correct; }
      else { wrong += 1; section.wrong += 1; section.score += profile.marking.wrong; }
    } else { unattempted += 1; section.unattempted += 1; }
    sections.set(snapshot.section, section);
    const subKey = `${snapshot.section}\u0000${question?.category || 'Other'}\u0000${question?.subcategory || 'Other'}`;
    const group = subcategories.get(subKey) || { section: snapshot.section, category: question?.category || 'Other', subcategory: question?.subcategory || 'Other', correct: 0, wrong: 0, total: 0 };
    group.correct += Number(isCorrect); group.wrong += Number(isWrong); group.total += 1;
    subcategories.set(subKey, group);
    if (question && response?.chosen) {
      await updateQuestionDifficultyStats(question, response, isCorrect);
    }
  }
  for (const group of subcategories.values()) group.accuracy = group.correct / (group.correct + group.wrong) || 0;
  return { score: Math.round((correct * profile.marking.correct + wrong * profile.marking.wrong) * 100) / 100, correct, wrong, unattempted, accuracy: correct / (correct + wrong) || 0, sections: [...sections.values()], subcategories: [...subcategories.values()] };
}

export async function submitAttempt(id, automatic = false) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('INVALID_ATTEMPT_ID', 'Attempt id is invalid.', 400);
  const attempt = await Attempt.findById(id);
  if (!attempt) throw new AppError('ATTEMPT_NOT_FOUND', 'Attempt was not found.', 404);
  if (attempt.status !== 'in_progress') return attempt;
  attempt.result = await calculateResult(attempt, automatic ? 'auto_submitted' : 'submitted');
  attempt.status = automatic ? 'auto_submitted' : 'submitted';
  attempt.submittedAt = new Date();
  await attempt.save();
  return attempt;
}

export async function getAttempt(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('INVALID_ATTEMPT_ID', 'Attempt id is invalid.', 400);
  let attempt = await Attempt.findById(id);
  if (!attempt) throw new AppError('ATTEMPT_NOT_FOUND', 'Attempt was not found.', 404);
  if (attempt.status === 'in_progress' && Date.now() >= attempt.endsAt.getTime()) attempt = await submitAttempt(id, true);
  return loadPublicAttempt(attempt);
}

export async function saveAnswer(id, input) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('INVALID_ATTEMPT_ID', 'Attempt id is invalid.', 400);
  const parsed = answerSchema.parse(input);
  let attempt = await Attempt.findById(id);
  if (!attempt) throw new AppError('ATTEMPT_NOT_FOUND', 'Attempt was not found.', 404);
  if (attempt.status !== 'in_progress') throw new AppError('ATTEMPT_CLOSED', 'This attempt is already submitted.', 409);
  if (Date.now() > attempt.endsAt.getTime() + 5_000) {
    attempt = await submitAttempt(id, true);
    throw new AppError('ATTEMPT_EXPIRED', 'The exam time has ended and the attempt was auto-submitted.', 409);
  }
  const response = attempt.responses.find((item) => String(item.questionId) === parsed.questionId);
  if (!response) throw new AppError('QUESTION_NOT_IN_ATTEMPT', 'Question does not belong to this attempt.', 404);
  response.chosen = parsed.chosen;
  response.status = parsed.status;
  response.timeSpentSec = parsed.timeSpentSec;
  response.lastUpdated = new Date();
  await attempt.save();
  return { savedAt: response.lastUpdated, status: attempt.status };
}

export async function getAttemptResult(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('INVALID_ATTEMPT_ID', 'Attempt id is invalid.', 400);
  const attempt = await Attempt.findById(id).lean();
  if (!attempt) throw new AppError('ATTEMPT_NOT_FOUND', 'Attempt was not found.', 404);
  if (attempt.status === 'in_progress') throw new AppError('RESULT_NOT_READY', 'The attempt must be submitted before viewing answers.', 409);
  const mock = await MockTest.findById(attempt.mockTestId).lean();
  const questions = await Question.find({ _id: { $in: mock.questions.map((item) => item.questionId) } }).lean();
  const byId = new Map(questions.map((question) => [String(question._id), question]));
  const responses = new Map(attempt.responses.map((response) => [String(response.questionId), response]));
  const review = mock.questions.map((snapshot) => {
    const question = byId.get(String(snapshot.questionId));
    return question ? { ...safeQuestion(question, snapshot), chosen: responses.get(String(question._id))?.chosen || null, correctOption: question.correctOption, explanation: question.explanation } : null;
  }).filter(Boolean);
  return { attempt, mockTest: mock, result: attempt.result, review };
}

export async function listAttempts() {
  const attempts = await Attempt.find().sort({ startedAt: -1 }).select('-responses').populate('mockTestId', 'title').lean();
  return attempts.map((attempt) => ({ _id: attempt._id, mockTestId: attempt.mockTestId?._id, title: attempt.mockTestId?.title || 'Mock test', status: attempt.status, startedAt: attempt.startedAt, submittedAt: attempt.submittedAt, score: attempt.result?.score }));
}
