import { asyncHandler } from '../utils/errors.js';
import { createAttempt, getAttempt, getAttemptResult, listAttempts, saveAnswer, submitAttempt } from '../services/attempts.service.js';
import { createResultPdf } from '../services/result-pdf.service.js';

export const postAttempt = asyncHandler(async (req, res) => res.status(201).json({ ok: true, data: await createAttempt(req.body) }));
export const getOneAttempt = asyncHandler(async (req, res) => res.json({ ok: true, data: await getAttempt(req.params.id) }));
export const putAttemptAnswer = asyncHandler(async (req, res) => res.json({ ok: true, data: await saveAnswer(req.params.id, req.body) }));
export const postSubmitAttempt = asyncHandler(async (req, res) => res.json({ ok: true, data: await submitAttempt(req.params.id) }));
export const getResult = asyncHandler(async (req, res) => res.json({ ok: true, data: await getAttemptResult(req.params.id) }));
export const getAttempts = asyncHandler(async (_req, res) => res.json({ ok: true, data: await listAttempts() }));
export const getResultPdf = asyncHandler(async (req, res) => {
  const pdf = await createResultPdf(req.params.id);
  res.type('application/pdf').set('Content-Disposition', `attachment; filename="mock-test-result-${req.params.id}.pdf"`).send(pdf);
});
