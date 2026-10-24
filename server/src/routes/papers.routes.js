import { Router } from 'express';
import { approvePaperQuestions, extractPaper, getOnePaper, getPaperPage, getPaperUsage, listAllPapers, removePaper, uploadPaper } from '../controllers/papers.controller.js';
import { uploadPaperFile } from '../middleware/upload.js';

const router = Router();

router.post('/', uploadPaperFile, uploadPaper);
router.post('/:id/extract', extractPaper);
router.post('/:id/approve', approvePaperQuestions);
router.get('/', listAllPapers);
router.get('/:id/usage', getPaperUsage);
router.get('/:id/pages/:n', getPaperPage);
router.get('/:id', getOnePaper);
router.delete('/:id', removePaper);

export default router;
