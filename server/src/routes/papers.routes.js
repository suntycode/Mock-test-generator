import { Router } from 'express';
import {
  appendQuestionsJson,
  approvePaperQuestions,
  extractPaper,
  getOnePaper,
  getPaperPage,
  getPaperUsage,
  importPaperJson,
  listAllPapers,
  removePaper,
  uploadPaper
} from '../controllers/papers.controller.js';
import { uploadPaperFile } from '../middleware/upload.js';

const router = Router();

router.post('/import-json', importPaperJson);
router.post('/json', importPaperJson);
router.post('/', uploadPaperFile, uploadPaper);
router.post('/:id/questions', appendQuestionsJson);
router.post('/:id/extract', extractPaper);
router.post('/:id/approve', approvePaperQuestions);
router.get('/', listAllPapers);
router.get('/:id/usage', getPaperUsage);
router.get('/:id/pages/:n', getPaperPage);
router.get('/:id', getOnePaper);
router.delete('/:id', removePaper);

export default router;
