export function buildPageChunks(totalPages, pagesPerChunk) {
  const chunks = [];
  let startPage = 1;
  while (startPage <= totalPages) {
    const endPage = Math.min(totalPages, startPage + pagesPerChunk - 1);
    chunks.push({ id: chunks.length + 1, startPage, endPage, pages: Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index) });
    if (endPage === totalPages) break;
    startPage = endPage;
  }
  return chunks;
}

function optionCompleteness(question) {
  return ['A', 'B', 'C', 'D'].filter((option) => question.options?.[option]?.trim()).length;
}

function quality(question) {
  return question.confidence + optionCompleteness(question) * 0.025;
}

function questionsConflict(left, right) {
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  return normalize(left.text) !== normalize(right.text) || ['A', 'B', 'C', 'D'].some((key) => normalize(left.options?.[key]) !== normalize(right.options?.[key]));
}

export function mergeExtractedQuestions(existing, incoming) {
  const merged = new Map(existing.map((question) => [question.qNo, { ...question }]));
  const duplicateQNos = new Set();
  for (const candidate of incoming) {
    const current = merged.get(candidate.qNo);
    if (!current) {
      merged.set(candidate.qNo, { ...candidate });
      continue;
    }
    if (questionsConflict(current, candidate)) duplicateQNos.add(candidate.qNo);
    if (quality(candidate) > quality(current)) merged.set(candidate.qNo, { ...candidate });
  }
  return { questions: [...merged.values()].sort((a, b) => a.qNo - b.qNo), duplicateQNos: [...duplicateQNos] };
}

export function findMissingQuestionNumbers(questions, expectedCount) {
  const found = new Set(questions.map((question) => question.qNo));
  return Array.from({ length: expectedCount }, (_, index) => index + 1).filter((qNo) => !found.has(qNo));
}

export function findRetryPages(missingQNos, questions, totalPages, expectedCount) {
  const retryPages = new Set();
  for (const missingQNo of missingQNos) {
    let nearest = null;
    let distance = Infinity;
    for (const question of questions) {
      const nextDistance = Math.abs(question.qNo - missingQNo);
      if (Number.isInteger(question.sourcePage) && question.sourcePage > 0 && nextDistance < distance) {
        nearest = question.sourcePage;
        distance = nextDistance;
      }
    }
    const estimatedPage = nearest ?? Math.max(1, Math.ceil((missingQNo / expectedCount) * totalPages));
    for (const page of [estimatedPage - 1, estimatedPage, estimatedPage + 1]) {
      if (page >= 1 && page <= totalPages) retryPages.add(page);
    }
  }
  return [...retryPages].sort((a, b) => a - b);
}

export function groupContiguousPages(pages) {
  const groups = [];
  for (const page of [...pages].sort((a, b) => a - b)) {
    const last = groups.at(-1);
    if (last && page === last.at(-1) + 1) last.push(page);
    else groups.push([page]);
  }
  return groups;
}
