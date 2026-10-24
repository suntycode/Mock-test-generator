import { Router } from 'express';
import { getMockTests, getOneMockTest, postGenerateMock, postWeakAreaPractice } from '../controllers/mocktests.controller.js';

const router = Router();
router.post('/generate', postGenerateMock);
router.post('/weak-area-practice', postWeakAreaPractice);
router.get('/', getMockTests);
router.get('/:id', getOneMockTest);
export default router;
