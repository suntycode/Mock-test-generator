import { asyncHandler } from '../utils/errors.js';
import { generateMock, generateWeakAreaPractice, getMockTest, listMockTests } from '../services/generator.service.js';

export const postGenerateMock = asyncHandler(async (req, res) => {
  const result = await generateMock(req.body);
  res.status(201).json({ ok: true, data: result });
});
export const getMockTests = asyncHandler(async (_req, res) => res.json({ ok: true, data: await listMockTests() }));
export const getOneMockTest = asyncHandler(async (req, res) => res.json({ ok: true, data: await getMockTest(req.params.id) }));
export const postWeakAreaPractice = asyncHandler(async (req, res) => res.status(201).json({ ok: true, data: await generateWeakAreaPractice(req.body.attemptId) }));
