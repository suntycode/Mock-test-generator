import { Router } from 'express';
import { getBlueprint, getSummary, patchBlueprint, postBuildBlueprint } from '../controllers/analytics.controller.js';

const router = Router();
router.get('/summary', getSummary);
export default router;
