import { Router } from 'express';
import { getBlueprint, patchBlueprint, postBuildBlueprint } from '../controllers/analytics.controller.js';

const router = Router();
router.post('/build', postBuildBlueprint);
router.get('/latest', getBlueprint);
router.patch('/:id', patchBlueprint);
export default router;
