import { Router } from 'express';
import {
  getOneQuestion,
  getTaxonomyData,
  listAllQuestions,
  patchQuestion,
  postGenerateQuestions,
  postRetagQuestion,
  removeQuestion
} from '../controllers/questions.controller.js';

const router = Router();
router.get('/taxonomy', getTaxonomyData);
router.post('/generate', postGenerateQuestions);
router.get('/', listAllQuestions);
router.get('/:id', getOneQuestion);
router.patch('/:id', patchQuestion);
router.delete('/:id', removeQuestion);
router.post('/:id/retag', postRetagQuestion);
export default router;
