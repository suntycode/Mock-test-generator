import { Router } from 'express';
import { getAttempts, getOneAttempt, getResult, getResultPdf, postAttempt, postSubmitAttempt, putAttemptAnswer } from '../controllers/attempts.controller.js';

const router = Router();
router.post('/', postAttempt);
router.get('/', getAttempts);
router.get('/:id', getOneAttempt);
router.put('/:id/answer', putAttemptAnswer);
router.post('/:id/submit', postSubmitAttempt);
router.get('/:id/result', getResult);
router.get('/:id/result.pdf', getResultPdf);
export default router;
