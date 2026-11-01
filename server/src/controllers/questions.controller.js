import { asyncHandler } from '../utils/errors.js';
import { deleteQuestion, getQuestion, listQuestions, redactAnswersDuringAttempts, retagQuestion, updateQuestion } from '../services/questions.service.js';
import { generateMoreQuestions } from '../services/ai-generation.service.js';
import { loadTaxonomy } from '../services/taxonomy.service.js';

export const listAllQuestions = asyncHandler(async (req, res) => res.json({ ok: true, data: await listQuestions(req.query) }));
export const getTaxonomyData = asyncHandler(async (_req, res) => res.json({ ok: true, data: await loadTaxonomy() }));
export const getOneQuestion = asyncHandler(async (req, res) => res.json({ ok: true, data: await getQuestion(req.params.id) }));
export const patchQuestion = asyncHandler(async (req, res) => res.json({ ok: true, data: await updateQuestion(req.params.id, req.body) }));
export const removeQuestion = asyncHandler(async (req, res) => res.json({ ok: true, data: await deleteQuestion(req.params.id) }));
export const postRetagQuestion = asyncHandler(async (req, res) => res.json({ ok: true, data: await retagQuestion(req.params.id) }));
export const postGenerateQuestions = asyncHandler(async (req, res) => res.status(201).json({ ok: true, data: await redactAnswersDuringAttempts(await generateMoreQuestions(req.body)) }));
