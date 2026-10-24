import { asyncHandler } from '../utils/errors.js';
import {
  addQuestionsToPaper,
  createPaper,
  deletePaper,
  getPageImagePath,
  getPaper,
  importPaperWithQuestions,
  listPapers
} from '../services/papers.service.js';
import { startPaperExtraction } from '../services/extraction.service.js';
import { approvePaper } from '../services/questions.service.js';
import TokenUsage from '../models/TokenUsage.js';

export const uploadPaper = asyncHandler(async (req, res) => {
  const paper = await createPaper(req.body, req.file);
  res.status(201).json({ ok: true, data: paper });
});

export const importPaperJson = asyncHandler(async (req, res) => {
  const result = await importPaperWithQuestions(req.body);
  res.status(201).json({ ok: true, data: result });
});

export const appendQuestionsJson = asyncHandler(async (req, res) => {
  const result = await addQuestionsToPaper(req.params.id, req.body);
  res.status(201).json({ ok: true, data: result });
});

export const listAllPapers = asyncHandler(async (_req, res) => {
  res.json({ ok: true, data: await listPapers() });
});

export const getOnePaper = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await getPaper(req.params.id) });
});

export const getPaperPage = asyncHandler(async (req, res, next) => {
  const imagePath = await getPageImagePath(req.params.id, req.params.n);
  res.type('png').sendFile(imagePath, (error) => {
    if (error) next(error);
  });
});

export const extractPaper = asyncHandler(async (req, res) => {
  const specificChunk = req.body?.chunkId ?? req.body?.chunkIds;
  const extraction = await startPaperExtraction(req.params.id, specificChunk);
  res.status(202).json({ ok: true, data: extraction });
});

export const approvePaperQuestions = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await approvePaper(req.params.id) });
});

export const removePaper = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await deletePaper(req.params.id) });
});

export const getPaperUsage = asyncHandler(async (req, res) => {
  const paperId = req.params.id;
  const records = await TokenUsage.find({ paperId }).sort({ createdAt: 1 }).lean();
  const totals = {
    extract: { calls: 0, promptTokens: 0, candidatesTokens: 0, thoughtsTokens: 0, totalTokens: 0 },
    tag: { calls: 0, promptTokens: 0, candidatesTokens: 0, thoughtsTokens: 0, totalTokens: 0 },
    verify: { calls: 0, promptTokens: 0, candidatesTokens: 0, thoughtsTokens: 0, totalTokens: 0 },
    generate: { calls: 0, promptTokens: 0, candidatesTokens: 0, thoughtsTokens: 0, totalTokens: 0 },
    all: { calls: 0, promptTokens: 0, candidatesTokens: 0, thoughtsTokens: 0, totalTokens: 0 }
  };
  for (const r of records) {
    const type = totals[r.callType] ? r.callType : 'extract';
    totals[type].calls += 1;
    totals[type].promptTokens += r.promptTokenCount;
    totals[type].candidatesTokens += r.candidatesTokenCount;
    totals[type].thoughtsTokens += r.thoughtsTokenCount;
    totals[type].totalTokens += r.totalTokenCount;

    totals.all.calls += 1;
    totals.all.promptTokens += r.promptTokenCount;
    totals.all.candidatesTokens += r.candidatesTokenCount;
    totals.all.thoughtsTokens += r.thoughtsTokenCount;
    totals.all.totalTokens += r.totalTokenCount;
  }
  res.json({ ok: true, data: { paperId, totals, records } });
});
