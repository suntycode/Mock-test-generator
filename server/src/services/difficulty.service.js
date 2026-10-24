import Question from '../models/Question.js';

export async function updateQuestionDifficultyStats(question, response, correct) {
  const previousAttempts = question.stats?.attempts || 0;
  const attempts = previousAttempts + 1;
  const correctCount = (question.stats?.correct || 0) + Number(correct);
  const timeSpent = response?.timeSpentSec || 0;
  const avgTimeSec = ((question.stats?.avgTimeSec || 0) * previousAttempts + timeSpent) / attempts;
  const changes = { stats: { attempts, correct: correctCount, avgTimeSec } };
  if (attempts >= 2) {
    const accuracy = correctCount / attempts;
    changes.difficulty = accuracy >= 0.8 ? 'easy' : accuracy <= 0.35 ? 'hard' : 'medium';
    changes.difficultySource = 'calibrated';
  }
  await Question.updateOne({ _id: question._id }, { $set: changes });
}
