import ExamProfile from '../models/ExamProfile.js';
import { loadTaxonomy } from './taxonomy.service.js';

export const rrbNtpcProfile = {
  key: 'rrb-ntpc-ug-cbt2',
  name: 'RRB NTPC Undergraduate CBT-II',
  durationMinutes: 90,
  totalQuestions: 120,
  marking: { correct: 1, wrong: -0.3333333333, unattempted: 0 },
  sections: [
    { name: 'General Awareness', questions: 50, order: 1 },
    { name: 'Mathematics', questions: 35, order: 2 },
    { name: 'General Intelligence and Reasoning', questions: 35, order: 3 }
  ],
  sectionLock: false,
  optionsPerQuestion: 4,
  languages: ['hi', 'en']
};

export async function seedInitialData() {
  const [profile] = await Promise.all([
    ExamProfile.findOneAndUpdate({ key: rrbNtpcProfile.key }, { $setOnInsert: rrbNtpcProfile }, { upsert: true, new: true }),
    loadTaxonomy()
  ]);
  return { profile };
}
