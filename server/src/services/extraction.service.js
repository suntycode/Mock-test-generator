import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import Paper from '../models/Paper.js';
import Question from '../models/Question.js';
import ExamProfile from '../models/ExamProfile.js';
import { extractQuestionsFromPageImages, extractedQuestionsSchema, tagQuestionBatch } from './gemini.service.js';
import { loadTaxonomy, normalizeTags } from './taxonomy.service.js';
import { getExtractedChunkIdsFromDisk } from './papers.service.js';
import { AppError } from '../utils/errors.js';
import { buildPageChunks, findMissingQuestionNumbers, findRetryPages, groupContiguousPages, mergeExtractedQuestions } from '../utils/extraction.js';

const serverRoot = fileURLToPath(new URL('../../', import.meta.url));
const storageRoot = path.resolve(serverRoot, env.STORAGE_DIR);
const queuedPaperIds = new Set();
const pendingPaperIds = [];
let activeJobs = 0;

function safeErrorDetails(error) {
  const message = String(error?.message || 'Unknown error');
  return {
    errorName: error?.name || 'Error',
    errorStatus: error?.status ?? error?.statusCode ?? error?.response?.status ?? null,
    errorMessage: env.GEMINI_API_KEY ? message.replaceAll(env.GEMINI_API_KEY, '[REDACTED]') : message
  };
}

function toRawQuestion(question) {
  return {
    qNo: question.qNo,
    section: question.section,
    text: question.text,
    options: question.options,
    correctOption: question.correctOption,
    hasFigure: question.hasFigure,
    sourcePage: question.sourcePage,
    confidence: question.confidence,
    language: question.language,
    validationErrors: question.validationErrors || []
  };
}

function toStoredQuestion(paper, question, duplicateQNos) {
  const reviewReasons = new Set(question.reviewReasons || []);
  if (duplicateQNos.has(question.qNo)) reviewReasons.add('duplicate qNo');
  if (question.hasFigure) reviewReasons.add('figure/formula — check page image');
  if (typeof question.confidence === 'number' && question.confidence < 0.8) reviewReasons.add('low confidence');
  if (!question.correctOption) reviewReasons.add('missing answer');
  if (['A', 'B', 'C', 'D'].some((key) => !question.options?.[key]?.trim())) reviewReasons.add('missing/empty option');
  if (Array.isArray(question.validationErrors) && question.validationErrors.length > 0) {
    for (const err of question.validationErrors) reviewReasons.add(`validation issue: ${err}`);
  }
  const reasons = [...reviewReasons];
  return {
    paperId: paper._id,
    examKey: paper.examKey,
    qNo: question.qNo,
    section: question.section,
    category: question.category || 'Other',
    subcategory: question.subcategory || 'Other',
    difficulty: question.difficulty || 'medium',
    difficultySource: question.difficultySource || 'ai',
    language: question.language,
    text: question.text,
    options: question.options,
    correctOption: question.correctOption,
    explanation: question.explanation || '',
    hasFigure: Boolean(question.hasFigure),
    sourcePage: question.sourcePage,
    confidence: question.confidence,
    needsReview: reasons.length > 0,
    reviewReasons: reasons,
    origin: 'extracted',
    verified: false,
    stats: { attempts: 0, correct: 0, avgTimeSec: 0 }
  };
}

function storedToRaw(question) {
  return toRawQuestion(question);
}

function getPaperFolder(paperId) {
  return path.join(storageRoot, 'papers', String(paperId));
}

async function loadChunkImages(paperId, pages) {
  return Promise.all(pages.map((page) => readFile(path.join(getPaperFolder(paperId), 'pages', `page-${String(page).padStart(3, '0')}.png`))));
}

function mapExtractedQuestion(question, startPage, pageCount) {
  const validLocalPage = question.page_number <= pageCount;
  return {
    qNo: question.q_no,
    section: question.section,
    text: question.question_text,
    options: question.options,
    correctOption: question.correct_option,
    hasFigure: Boolean(question.has_figure_or_formula),
    language: question.language,
    confidence: validLocalPage ? question.confidence : Math.min(question.confidence, 0.79),
    sourcePage: startPage + (validLocalPage ? question.page_number : 1) - 1,
    validationErrors: question.validationErrors || []
  };
}

async function persistMergedQuestions(paper, incoming, duplicateQNos) {
  const existingDocuments = await Question.find({ paperId: paper._id }).lean();
  const merged = mergeExtractedQuestions(existingDocuments.map(storedToRaw), incoming);
  for (const qNo of merged.duplicateQNos) duplicateQNos.add(qNo);
  if (merged.questions.length > 0) {
    await Question.bulkWrite(merged.questions.map((question) => ({
      updateOne: {
        filter: { paperId: paper._id, qNo: question.qNo },
        update: { $set: toStoredQuestion(paper, question, duplicateQNos) },
        upsert: true
      }
    })), { ordered: false });
  }
  return merged.questions.length;
}

async function updatePaperProgressAndStats(paperId, expectedQuestions, progress) {
  const currentQuestions = await Question.find({ paperId }).select('qNo needsReview').lean();
  const found = currentQuestions.length;
  const missingQNos = findMissingQuestionNumbers(currentQuestions, expectedQuestions);
  const needsReview = currentQuestions.filter((q) => q.needsReview).length;
  await Paper.updateOne(
    { _id: paperId },
    {
      $set: {
        progress,
        extractionStats: {
          found,
          expected: expectedQuestions,
          needsReview,
          missingQNos
        }
      }
    }
  );
}

async function extractChunk(paper, chunk, duplicateQNos) {
  const cacheDir = path.join(getPaperFolder(paper._id), 'cache');
  const cachePath = path.join(cacheDir, `chunk-${chunk.id}.json`);
  let extracted = null;
  try {
    const cachedData = await readFile(cachePath, 'utf8');
    extracted = JSON.parse(cachedData);
    logger.info({ paperId: String(paper._id), chunk: chunk.id }, 'Loaded chunk from cache');
  } catch {}

  if (!extracted) {
    const images = await loadChunkImages(paper._id, chunk.pages);
    extracted = await extractQuestionsFromPageImages(images, {
      paperId: paper._id,
      chunk: chunk.id,
      callType: 'extract'
    });
    try {
      await mkdir(cacheDir, { recursive: true });
      await writeFile(cachePath, JSON.stringify(extracted, null, 2), 'utf8');
    } catch {}
  }

  const mapped = extracted.map((question) => mapExtractedQuestion(question, chunk.startPage, chunk.pages.length));
  return persistMergedQuestions(paper, mapped, duplicateQNos);
}

function reviewReasonsFor(question, tags, missingByQuestion, duplicateQNos) {
  const reasons = new Set(question.reviewReasons || []);
  if (tags.needsReview) reasons.add('unknown tag');
  if (['A', 'B', 'C', 'D'].some((key) => !question.options?.[key]?.trim())) reasons.add('missing/empty option');
  if (!question.correctOption) reasons.add('missing answer');
  if (question.confidence < 0.8) reasons.add('low confidence');
  if (question.hasFigure) reasons.add('figure/formula — check page image');
  if (duplicateQNos.has(question.qNo)) reasons.add('duplicate qNo');
  if (tags.answerMismatch) reasons.add('answer mismatch');
  for (const missingQNo of missingByQuestion.get(question.qNo) || []) reasons.add(`missing qNo ${missingQNo}`);
  if (tags.taggingFailed) reasons.add('tagging failed');
  return [...reasons];
}

function mapMissingToQuestions(questions, missingQNos) {
  const map = new Map();
  for (const missingQNo of missingQNos) {
    if (questions.length === 0) break;
    const nearest = questions.reduce((best, question) => Math.abs(question.qNo - missingQNo) < Math.abs(best.qNo - missingQNo) ? question : best);
    const values = map.get(nearest.qNo) || [];
    values.push(missingQNo);
    map.set(nearest.qNo, values);
  }
  return map;
}

async function tagAndValidateQuestions(paper, taxonomy, duplicateQNos, missingQNos, targetPages = null) {
  const filter = { paperId: paper._id };
  if (Array.isArray(targetPages) && targetPages.length > 0) {
    filter.sourcePage = { $in: targetPages };
  }
  const questions = await Question.find(filter).sort({ qNo: 1 });
  const missingByQuestion = mapMissingToQuestions(questions, missingQNos);
  const batchSize = 6;
  for (let start = 0; start < questions.length; start += batchSize) {
    const batch = questions.slice(start, start + batchSize);
    let tagged;
    try {
      tagged = await tagQuestionBatch(batch.map(toRawQuestion), taxonomy, {
        paperId: paper._id,
        chunk: Math.floor(start / batchSize) + 1,
        callType: 'tag'
      });
      if (tagged.length !== batch.length) throw new Error('Tagging response count did not match input batch.');
    } catch {
      tagged = batch.map(() => null);
    }

    for (const [index, question] of batch.entries()) {
      const tag = tagged[index];
      const normalized = normalizeTags(tag || { section: question.section, category: null, subcategory: null, qNo: question.qNo }, taxonomy);
      const answerMismatch = tag?.answer_check?.mismatch === true;
      const reviewReasons = reviewReasonsFor(question, { ...normalized, answerMismatch, taggingFailed: !tag }, missingByQuestion, duplicateQNos);
      question.section = normalized.section || question.section;
      question.category = normalized.category;
      question.subcategory = normalized.subcategory;
      if (tag) {
        question.difficulty = tag.difficulty;
        question.difficultySource = 'ai';
        question.explanation = tag.explanation || '';
      }
      question.needsReview = reviewReasons.length > 0;
      question.reviewReasons = reviewReasons;
      await question.save();
    }
  }
  return questions.filter((question) => question.needsReview).length;
}

function chunkIdsForPages(chunks, pages) {
  return new Set(pages.map((page) => chunks.find((chunk) => chunk.pages.includes(page))?.id).filter(Boolean));
}

async function runPaperExtraction(paperId, requestedChunkIds = []) {
  const paper = await Paper.findById(paperId);
  if (!paper) return;
  const profile = await ExamProfile.findOne({ key: paper.examKey }).lean();
  if (!profile) throw new Error('Exam profile was not found for extraction.');
  const expectedQuestions = profile.totalQuestions;
  const chunks = buildPageChunks(paper.totalPages, env.PAGES_PER_CHUNK);
  
  const diskCachedIds = await getExtractedChunkIdsFromDisk(paper._id);
  const extractedChunkIds = new Set([
    ...(paper.progress?.extractedChunks || []),
    ...diskCachedIds
  ]);
  const failedChunkIds = new Set(paper.progress?.failedChunks || []);

  const validChunkIds = requestedChunkIds.filter((chunkId) => chunks.some((chunk) => chunk.id === chunkId));

  // Only extract chunks that are NOT already extracted (or explicitly requested)
  // Already extracted chunks are NEVER extracted again
  let selectedChunks = [];
  if (validChunkIds.length > 0) {
    selectedChunks = chunks.filter((chunk) => validChunkIds.includes(chunk.id));
  } else {
    selectedChunks = chunks.filter((chunk) => !extractedChunkIds.has(chunk.id) || failedChunkIds.has(chunk.id));
  }

  // Clear selected chunks from failedChunkIds since they are being retried now
  for (const chunk of selectedChunks) {
    failedChunkIds.delete(chunk.id);
  }

  const duplicateQNos = new Set();
  let retryPagesTotal = paper.progress?.retryPagesTotal || 0;
  let retryPagesDone = paper.progress?.retryPagesDone || 0;

  const isPartialExtraction = validChunkIds.length > 0;
  const isFullExtraction = !isPartialExtraction;

  await updatePaperProgressAndStats(paperId, expectedQuestions, {
    chunksTotal: chunks.length,
    chunksDone: extractedChunkIds.size,
    extractedChunks: [...extractedChunkIds].sort((a, b) => a - b),
    failedChunks: [...failedChunkIds].sort((a, b) => a - b),
    activeChunks: selectedChunks.map((c) => c.id),
    retryPagesTotal,
    retryPagesDone
  });

  for (const chunk of selectedChunks) {
    const preFailed = [...failedChunkIds].sort((a, b) => a - b);
    const preExtracted = [...extractedChunkIds].sort((a, b) => a - b);
    await updatePaperProgressAndStats(paperId, expectedQuestions, {
      chunksTotal: chunks.length,
      chunksDone: preExtracted.length,
      extractedChunks: preExtracted,
      failedChunks: preFailed,
      activeChunks: [chunk.id],
      retryPagesTotal,
      retryPagesDone
    });

    try {
      await extractChunk(paper, chunk, duplicateQNos);
      extractedChunkIds.add(chunk.id);
      failedChunkIds.delete(chunk.id);
    } catch (error) {
      failedChunkIds.add(chunk.id);
      extractedChunkIds.delete(chunk.id);
      logger.error({ paperId: String(paperId), chunk: chunk.id, ...safeErrorDetails(error) }, 'Extraction chunk failed after retries');
    }
    const currentFailed = [...failedChunkIds].sort((a, b) => a - b);
    const currentExtracted = [...extractedChunkIds].sort((a, b) => a - b);
    await updatePaperProgressAndStats(paperId, expectedQuestions, {
      chunksTotal: chunks.length,
      chunksDone: currentExtracted.length,
      extractedChunks: currentExtracted,
      failedChunks: currentFailed,
      activeChunks: selectedChunks.map((c) => c.id),
      retryPagesTotal,
      retryPagesDone
    });
  }

  let extractedQuestions = await Question.find({ paperId }).sort({ qNo: 1 }).lean();
  let missingQNos = findMissingQuestionNumbers(extractedQuestions, expectedQuestions);

  // Missing question retry pages should ONLY run if all chunks of the paper were processed
  // When extracting a single chunk, do not run full-paper missing-page retries
  if (isFullExtraction && missingQNos.length > 0 && failedChunkIds.size === 0) {
    const retryPages = findRetryPages(missingQNos, extractedQuestions, paper.totalPages, expectedQuestions);
    const retryGroups = groupContiguousPages(retryPages).flatMap((group) => {
      const batches = [];
      for (let index = 0; index < group.length; index += env.PAGES_PER_CHUNK) {
        batches.push(group.slice(index, index + env.PAGES_PER_CHUNK));
      }
      return batches;
    });
    retryPagesTotal = retryGroups.length;
    retryPagesDone = 0;
    const currentFailed = [...failedChunkIds].sort((a, b) => a - b);
    const currentExtracted = [...extractedChunkIds].sort((a, b) => a - b);
    await updatePaperProgressAndStats(paperId, expectedQuestions, {
      chunksTotal: chunks.length,
      chunksDone: currentExtracted.length,
      extractedChunks: currentExtracted,
      failedChunks: currentFailed,
      activeChunks: [],
      retryPagesTotal,
      retryPagesDone
    });

    for (const pages of retryGroups) {
      try {
        const images = await loadChunkImages(paperId, pages);
        const extracted = await extractQuestionsFromPageImages(images);
        const mapped = extracted.map((question) => mapExtractedQuestion(question, pages[0], pages.length));
        await persistMergedQuestions(paper, mapped, duplicateQNos);
      } catch (error) {
        for (const failedChunkId of chunkIdsForPages(chunks, pages)) failedChunkIds.add(failedChunkId);
        logger.error({ paperId: String(paperId), pages, ...safeErrorDetails(error) }, 'Missing-question page retry failed after retries');
      }
      retryPagesDone += 1;
      const progressFailed = [...failedChunkIds].sort((a, b) => a - b);
      const progressExtracted = [...extractedChunkIds].sort((a, b) => a - b);
      await updatePaperProgressAndStats(paperId, expectedQuestions, {
        chunksTotal: chunks.length,
        chunksDone: progressExtracted.length,
        extractedChunks: progressExtracted,
        failedChunks: progressFailed,
        activeChunks: [],
        retryPagesTotal,
        retryPagesDone
      });
    }
    extractedQuestions = await Question.find({ paperId }).sort({ qNo: 1 }).lean();
    missingQNos = findMissingQuestionNumbers(extractedQuestions, expectedQuestions);
  }

  const taxonomy = await loadTaxonomy();
  const selectedPages = isFullExtraction ? null : selectedChunks.flatMap((c) => c.pages);
  const needsReview = await tagAndValidateQuestions(paper, taxonomy, duplicateQNos, missingQNos, selectedPages);
  const finalFound = await Question.countDocuments({ paperId });
  const finalFailedChunks = [...failedChunkIds].sort((a, b) => a - b);
  const finalExtractedChunks = [...extractedChunkIds].sort((a, b) => a - b);
  const allExtracted = chunks.length > 0 && finalExtractedChunks.length === chunks.length;

  let newStatus = 'extracted';
  if (finalFailedChunks.length > 0) {
    newStatus = 'failed';
  } else if (!allExtracted) {
    newStatus = 'uploaded';
  } else if (needsReview > 0 || missingQNos.length > 0) {
    newStatus = 'review';
  } else {
    newStatus = 'extracted';
  }

  await Paper.updateOne({ _id: paperId }, {
    $set: {
      status: newStatus,
      progress: {
        chunksTotal: chunks.length,
        chunksDone: finalExtractedChunks.length,
        extractedChunks: finalExtractedChunks,
        failedChunks: finalFailedChunks,
        activeChunks: [],
        retryPagesTotal,
        retryPagesDone
      },
      extractionStats: { found: finalFound, expected: expectedQuestions, needsReview, missingQNos },
      error: finalFailedChunks.length ? `Extraction failed for chunk(s): ${finalFailedChunks.join(', ')}` : ''
    }
  });
}

async function recoverJobFailure(paperId) {
  await Paper.updateOne({ _id: paperId, status: 'extracting' }, {
    $set: { status: 'failed', error: 'Extraction job stopped unexpectedly.' }
  });
}

function pumpQueue() {
  while (activeJobs < env.EXTRACTION_CONCURRENCY && pendingPaperIds.length > 0) {
    const { paperId, resumeChunkIds } = pendingPaperIds.shift();
    activeJobs += 1;
    runPaperExtraction(paperId, resumeChunkIds)
      .catch(async () => {
        logger.error({ paperId: String(paperId) }, 'Extraction job failed unexpectedly');
        await recoverJobFailure(paperId);
      })
      .finally(() => {
        activeJobs -= 1;
        queuedPaperIds.delete(String(paperId));
        pumpQueue();
      });
  }
}

export async function startPaperExtraction(paperId, specificChunkInput) {
  if (!mongoose.isValidObjectId(paperId)) throw new AppError('INVALID_PAPER_ID', 'Paper id is invalid.', 400);
  const paper = await Paper.findById(paperId);
  if (!paper) throw new AppError('PAPER_NOT_FOUND', 'Paper was not found.', 404);
  if (!['uploaded', 'failed', 'review', 'extracted'].includes(paper.status)) {
    throw new AppError('EXTRACTION_NOT_AVAILABLE', `Paper cannot be extracted while status is "${paper.status}".`, 409);
  }

  let requestedChunkIds = [];
  if (typeof specificChunkInput === 'number') {
    requestedChunkIds = [specificChunkInput];
  } else if (Array.isArray(specificChunkInput)) {
    requestedChunkIds = specificChunkInput.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  } else if (typeof specificChunkInput === 'string' && specificChunkInput.trim()) {
    requestedChunkIds = specificChunkInput.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
  }

  const chunks = buildPageChunks(paper.totalPages, env.PAGES_PER_CHUNK);
  const diskCachedIds = await getExtractedChunkIdsFromDisk(paper._id);
  const extractedChunkIds = new Set([
    ...(paper.progress?.extractedChunks || []),
    ...diskCachedIds
  ]);
  const failedChunkIds = new Set(paper.progress?.failedChunks || []);

  if (requestedChunkIds.length === 0) {
    // Select only chunks that are NOT yet extracted or are failed
    const unextractedChunks = chunks.filter((c) => !extractedChunkIds.has(c.id) || failedChunkIds.has(c.id));
    if (unextractedChunks.length === 0) {
      throw new AppError('ALL_CHUNKS_ALREADY_EXTRACTED', 'All chunks for this paper are already extracted.', 400);
    }
    requestedChunkIds = unextractedChunks.map((c) => c.id);
  }

  const key = String(paper._id);
  if (queuedPaperIds.has(key)) throw new AppError('EXTRACTION_ALREADY_QUEUED', 'Extraction is already queued for this paper.', 409);
  const claimed = await Paper.findOneAndUpdate(
    { _id: paper._id, status: paper.status },
    {
      $set: {
        status: 'extracting',
        error: '',
        'progress.activeChunks': requestedChunkIds
      }
    },
    { new: true }
  );
  if (!claimed) throw new AppError('EXTRACTION_ALREADY_QUEUED', 'Extraction was started by another request.', 409);

  queuedPaperIds.add(key);
  pendingPaperIds.push({ paperId: paper._id, resumeChunkIds: requestedChunkIds });
  pumpQueue();
  return { paperId: key, status: 'extracting', progress: claimed.progress, extractionStats: claimed.extractionStats };
}

export async function recoverInterruptedExtractions() {
  const result = await Paper.updateMany({ status: 'extracting' }, { $set: { status: 'uploaded', error: '' } });
  if (result.modifiedCount > 0) logger.warn({ count: result.modifiedCount }, 'Reset interrupted extraction jobs to uploaded');
}
