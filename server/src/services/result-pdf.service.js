import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getAttemptResult } from './attempts.service.js';

function pdfSafe(value) { return String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '?'); }

export async function createResultPdf(attemptId) {
  const data = await getAttemptResult(attemptId);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize = [595.28, 841.89];
  let page = pdf.addPage(pageSize);
  let y = page.getHeight() - 52;
  const newPage = () => { page = pdf.addPage(pageSize); y = page.getHeight() - 52; };
  const line = (value, { size = 11, strong = false, gap = 17, color = rgb(0.12, 0.16, 0.24) } = {}) => {
    const text = pdfSafe(value);
    const maxChars = Math.floor(495 / (size * 0.53));
    const wrapped = text.match(new RegExp(`.{1,${maxChars}}`, 'g')) || [''];
    for (const part of wrapped) {
      if (y < 45) newPage();
      page.drawText(part, { x: 50, y, size, font: strong ? bold : font, color });
      y -= gap;
    }
  };
  line('Mock Test Result', { size: 22, strong: true, gap: 30, color: rgb(0.25, 0.32, 0.72) });
  line(data.mockTest.title || 'Exam result', { size: 14, strong: true, gap: 24 });
  line(`Score: ${data.result.score}    Correct: ${data.result.correct}    Wrong: ${data.result.wrong}    Unattempted: ${data.result.unattempted}`);
  line(`Accuracy: ${(data.result.accuracy * 100).toFixed(1)}%    Marking: +1 / -1/3`, { gap: 24 });
  line('Section summary', { size: 15, strong: true, gap: 22 });
  for (const section of data.result.sections) line(`${section.name}: score ${section.score.toFixed(2)}, correct ${section.correct}, wrong ${section.wrong}, unattempted ${section.unattempted}, time ${section.timeSec}s`);
  line('Weak areas', { size: 15, strong: true, gap: 22 });
  const weak = [...data.result.subcategories].filter((item) => item.total > 0).sort((a, b) => a.accuracy - b.accuracy).slice(0, 10);
  for (const area of weak) line(`${area.section} / ${area.category} / ${area.subcategory}: ${(area.accuracy * 100).toFixed(1)}% (${area.correct}/${area.total})`);
  line('Answer review', { size: 15, strong: true, gap: 22 });
  for (const question of data.review) line(`Q${question.qNo}: your answer ${question.chosen || 'unanswered'}; correct ${question.correctOption || 'unknown'}; ${question.explanation || ''}`, { size: 9, gap: 13 });
  return Buffer.from(await pdf.save());
}
