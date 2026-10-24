import { asyncHandler } from '../utils/errors.js';
import { buildBlueprint, getAnalyticsSummary, getLatestBlueprint, updateBlueprint } from '../services/analytics.service.js';

export const getSummary = asyncHandler(async (req, res) => res.json({ ok: true, data: await getAnalyticsSummary(req.query.examKey) }));
export const postBuildBlueprint = asyncHandler(async (req, res) => res.status(201).json({ ok: true, data: await buildBlueprint(req.body) }));
export const getBlueprint = asyncHandler(async (req, res) => res.json({ ok: true, data: await getLatestBlueprint(req.query.examKey) }));
export const patchBlueprint = asyncHandler(async (req, res) => res.json({ ok: true, data: await updateBlueprint(req.params.id, req.body) }));
