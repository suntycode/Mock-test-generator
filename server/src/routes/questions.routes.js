import { Router } from 'express';
import { getOneQuestion, listAllQuestions, patchQuestion, postGenerateQuestions, postRetagQuestion } from '../controllers/questions.controller.js';

const router = Router();
router.post('/generate', postGenerateQuestions);
router.get('/', listAllQuestions);
router.get('/:id', getOneQuestion);
router.patch('/:id', patchQuestion);
router.post('/:id/retag', postRetagQuestion);
export default router;
