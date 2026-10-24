import { asyncHandler } from '../utils/errors.js';
import { getQuestion, listQuestions, redactAnswersDuringAttempts, retagQuestion, updateQuestion } from '../services/questions.service.js';
import { generateMoreQuestions } from '../services/ai-generation.service.js';

export const listAllQuestions = asyncHandler(async (req, res) => res.json({ ok: true, data: await listQuestions(req.query) }));
export const getOneQuestion = asyncHandler(async (req, res) => res.json({ ok: true, data: await getQuestion(req.params.id) }));
export const patchQuestion = asyncHandler(async (req, res) => res.json({ ok: true, data: await updateQuestion(req.params.id, req.body) }));
export const postRetagQuestion = asyncHandler(async (req, res) => res.json({ ok: true, data: await retagQuestion(req.params.id) }));
export const postGenerateQuestions = asyncHandler(async (req, res) => res.status(201).json({ ok: true, data: await redactAnswersDuringAttempts(await generateMoreQuestions(req.body)) }));
