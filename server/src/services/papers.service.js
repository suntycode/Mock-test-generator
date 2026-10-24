import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { PDFDocument } from 'pdf-lib';
import { pdf as pdfToImg } from 'pdf-to-img';
import { z } from 'zod';
import { env } from '../config/env.js';
import ExamProfile from '../models/ExamProfile.js';
import Paper from '../models/Paper.js';
import Question from '../models/Question.js';
import { buildPageChunks, findMissingQuestionNumbers } from '../utils/extraction.js';
import { loadTaxonomy, normalizeTags } from './taxonomy.service.js';
import { AppError } from '../utils/errors.js';

const serverRoot = fileURLToPath(new URL('../../', import.meta.url));
const storageRoot = path.resolve(serverRoot, env.STORAGE_DIR);

export async function getExtractedChunkIdsFromDisk(paperId) {
  const cacheDir = path.join(storageRoot, 'papers', String(paperId), 'cache');
  try {
    const files = await readdir(cacheDir);
    const chunkIds = [];
    for (const f of files) {
      const match = f.match(/^chunk-(\d+)\.json$/);
      if (match) {
        chunkIds.push(Number(match[1]));
      }
    }
    return chunkIds.sort((a, b) => a - b);
  } catch {
    return [];
  }
}

const uploadFieldsSchema = z.object({
  examKey: z.string().trim().min(1),
  title: z.string().trim().min(1),
  examDate: z.coerce.date(),
  shift: z.string().trim().min(1)
});

function pageImageUrl(paperId, pageNumber) {
  return `/api/papers/${paperId}/pages/${pageNumber}`;
}

export async function serializePaperWithChunks(paper) {
  const data = paper.toObject ? paper.toObject() : { ...paper };
  data.pageImageUrls = Array.from({ length: data.totalPages || 0 }, (_, index) => pageImageUrl(data._id, index + 1));

  const totalPages = data.totalPages || 0;
  const rawChunks = buildPageChunks(totalPages, env.PAGES_PER_CHUNK);
  const diskCachedIds = await getExtractedChunkIdsFromDisk(data._id);

  const extractedSet = new Set([
    ...(data.progress?.extractedChunks || []),
    ...diskCachedIds
  ]);
  const failedSet = new Set(data.progress?.failedChunks || []);

  // For fully extracted/review/approved papers that predated extractedChunks field
  if (['extracted', 'review', 'approved'].includes(data.status)) {
    for (const c of rawChunks) {
      if (!failedSet.has(c.id)) {
        extractedSet.add(c.id);
      }
    }
  }

  const activeSet = new Set(data.progress?.activeChunks || []);

  const chunks = rawChunks.map((chunk) => {
    let chunkStatus = 'pending';
    if (activeSet.has(chunk.id)) {
      chunkStatus = 'extracting';
    } else if (extractedSet.has(chunk.id)) {
      chunkStatus = 'extracted';
    } else if (failedSet.has(chunk.id)) {
      chunkStatus = 'failed';
    } else if (data.status === 'extracting' && activeSet.size === 0) {
      chunkStatus = 'extracting';
    } else {
      chunkStatus = 'pending';
    }

    return {
      id: chunk.id,
      startPage: chunk.startPage,
      endPage: chunk.endPage,
      pageCount: chunk.pages.length,
      pages: chunk.pages,
      status: chunkStatus,
      isExtracted: chunkStatus === 'extracted',
      isFailed: chunkStatus === 'failed',
      isPending: chunkStatus === 'pending',
      hasCache: diskCachedIds.includes(chunk.id)
    };
  });

  const extractedCount = chunks.filter((c) => c.status === 'extracted').length;
  const pendingCount = chunks.filter((c) => c.status === 'pending' || c.status === 'extracting').length;
  const failedCount = chunks.filter((c) => c.status === 'failed').length;

  data.chunks = chunks;
  data.chunkSummary = {
    total: chunks.length,
    extracted: extractedCount,
    pending: pendingCount,
    failed: failedCount,
    allExtracted: chunks.length > 0 && extractedCount === chunks.length
  };

  return data;
}

function serializePaper(paper) {
  const data = paper.toObject ? paper.toObject() : { ...paper };
  data.pageImageUrls = Array.from({ length: data.totalPages || 0 }, (_, index) => pageImageUrl(data._id, index + 1));
  return data;
}

export async function createPaper(fields, file) {
  const parsed = uploadFieldsSchema.safeParse(fields);
  if (!parsed.success) {
    const details = parsed.error.issues.map(({ path: fieldPath, message }) => `${fieldPath.join('.')}: ${message}`).join('; ');
    throw new AppError('VALIDATION_ERROR', details, 400);
  }
  if (!file) throw new AppError('FILE_REQUIRED', 'A PDF file is required in the "file" field.', 400);
  if (!file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new AppError('INVALID_PDF', 'The uploaded file is not a valid PDF.', 400);
  }

  const profileExists = await ExamProfile.exists({ key: parsed.data.examKey });
  if (!profileExists) throw new AppError('EXAM_PROFILE_NOT_FOUND', `Unknown examKey: ${parsed.data.examKey}`, 404);

  let pdfDocument;
  try {
    pdfDocument = await PDFDocument.load(file.buffer);
  } catch {
    throw new AppError('INVALID_PDF', 'The uploaded PDF could not be opened.', 400);
  }
  const totalPages = pdfDocument.getPageCount();
  if (totalPages < 1) throw new AppError('INVALID_PDF', 'The uploaded PDF contains no pages.', 400);

  const paper = new Paper({
    ...parsed.data,
    originalFilename: path.basename(file.originalname),
    pdfPath: '',
    totalPages,
    status: 'uploaded'
  });
  const paperDirectory = path.join(storageRoot, 'papers', String(paper._id));
  const pagesDirectory = path.join(paperDirectory, 'pages');
  const originalPath = path.join(paperDirectory, 'original.pdf');

  try {
    await mkdir(pagesDirectory, { recursive: true });
    paper.pdfPath = path.relative(path.resolve(serverRoot, '..'), originalPath).split(path.sep).join('/');
    await writeFile(originalPath, file.buffer, { flag: 'wx' });

    const renderedDocument = await pdfToImg(originalPath, { scale: 150 / 72 });
    let pageNumber = 0;
    try {
      for await (const image of renderedDocument) {
        pageNumber += 1;
        const pageFilename = `page-${String(pageNumber).padStart(3, '0')}.png`;
        await writeFile(path.join(pagesDirectory, pageFilename), image, { flag: 'wx' });
      }
    } finally {
      await renderedDocument.destroy?.();
    }
    if (pageNumber !== totalPages) {
      throw new AppError('PDF_RENDER_FAILED', `Rendered ${pageNumber} of ${totalPages} PDF pages.`, 422);
    }
    await paper.save();
    return serializePaperWithChunks(paper);
  } catch (error) {
    await rm(paperDirectory, { recursive: true, force: true });
    if (error instanceof AppError) throw error;
    throw new AppError('PDF_RENDER_FAILED', 'Could not render the uploaded PDF pages.', 422);
  }
}

export async function listPapers() {
  const papers = await Paper.find().sort({ createdAt: -1 });
  return Promise.all(papers.map(serializePaperWithChunks));
}

export async function getPaper(paperId) {
  if (!mongoose.isValidObjectId(paperId)) throw new AppError('INVALID_PAPER_ID', 'Paper id is invalid.', 400);
  const paper = await Paper.findById(paperId);
  if (!paper) throw new AppError('PAPER_NOT_FOUND', 'Paper was not found.', 404);
  return serializePaperWithChunks(paper);
}

export async function deletePaper(paperId) {
  if (!mongoose.isValidObjectId(paperId)) throw new AppError('INVALID_PAPER_ID', 'Paper id is invalid.', 400);
  const paper = await Paper.findById(paperId);
  if (!paper) throw new AppError('PAPER_NOT_FOUND', 'Paper was not found.', 404);

  await Question.deleteMany({ paperId });
  const paperDirectory = path.join(storageRoot, 'papers', String(paper._id));
  await rm(paperDirectory, { recursive: true, force: true });
  await Paper.findByIdAndDelete(paperId);
  return { deleted: true, paperId };
}

export async function getPageImagePath(paperId, pageNumber) {
  if (!mongoose.isValidObjectId(paperId)) throw new AppError('INVALID_PAPER_ID', 'Paper id is invalid.', 400);
  const page = Number(pageNumber);
  if (!Number.isInteger(page) || page < 1) throw new AppError('INVALID_PAGE_NUMBER', 'Page number must be a positive integer.', 400);
  const paper = await Paper.findById(paperId).select('_id totalPages');
  if (!paper) throw new AppError('PAPER_NOT_FOUND', 'Paper was not found.', 404);
  if (page > paper.totalPages) throw new AppError('PAGE_NOT_FOUND', 'Page was not found.', 404);

  const filename = `page-${String(page).padStart(3, '0')}.png`;
  const imagePath = path.join(storageRoot, 'papers', String(paper._id), 'pages', filename);
  try {
    await readFile(imagePath);
  } catch {
    throw new AppError('PAGE_NOT_FOUND', 'Rendered page image was not found.', 404);
  }
  return imagePath;
}

const optionSchema = z.preprocess((val) => {
  if (Array.isArray(val) && val.length === 4) {
    return { A: String(val[0]), B: String(val[1]), C: String(val[2]), D: String(val[3]) };
  }
  if (val && typeof val === 'object') {
    return {
      A: String(val.A ?? val['1'] ?? val['a'] ?? '').trim(),
      B: String(val.B ?? val['2'] ?? val['b'] ?? '').trim(),
      C: String(val.C ?? val['3'] ?? val['c'] ?? '').trim(),
      D: String(val.D ?? val['4'] ?? val['d'] ?? '').trim()
    };
  }
  return val;
}, z.object({
  A: z.string().trim(),
  B: z.string().trim(),
  C: z.string().trim(),
  D: z.string().trim()
}));

const correctOptionSchema = z.preprocess((val) => {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).toUpperCase().trim();
  if (['A', 'B', 'C', 'D'].includes(str)) return str;
  if (str === '1' || str === '0') return 'A';
  if (str === '2') return 'B';
  if (str === '3') return 'C';
  if (str === '4') return 'D';
  return null;
}, z.enum(['A', 'B', 'C', 'D']).nullable().default(null));

export const importQuestionSchema = z.object({
  qNo: z.coerce.number().int().positive().optional(),
  section: z.string().trim().min(1).default('General Awareness'),
  category: z.string().trim().default('Other'),
  subcategory: z.string().trim().default('Other'),
  difficulty: z.enum(['easy', 'medium', 'hard']).catch('medium').default('medium'),
  difficultySource: z.enum(['ai', 'calibrated', 'manual']).default('manual'),
  language: z.enum(['hi', 'en', 'bilingual']).default('hi'),
  text: z.string().trim().min(1, 'Question text is required'),
  options: optionSchema,
  correctOption: correctOptionSchema,
  explanation: z.string().optional().default(''),
  hasFigure: z.boolean().optional().default(false),
  figurePath: z.string().optional().default(''),
  confidence: z.coerce.number().min(0).max(1).default(1),
  needsReview: z.boolean().optional(),
  reviewReasons: z.array(z.string()).default([]),
  verified: z.boolean().optional()
});

const questionItemPreprocessor = (item) => {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    text: item.text ?? item.question_text ?? item.question ?? '',
    correctOption: item.correctOption ?? item.correct_option ?? item.answer ?? null,
    qNo: item.qNo ?? item.q_no ?? item.questionNumber,
    hasFigure: item.hasFigure ?? item.has_figure ?? item.has_figure_or_formula ?? false
  };
};

export const importPaperSchema = z.object({
  examKey: z.string().trim().min(1).default('rrb-ntpc-ug-cbt2'),
  title: z.string().trim().min(1, 'Paper title is required'),
  examDate: z.coerce.date().default(() => new Date()),
  shift: z.string().trim().default('Shift 1'),
  autoApprove: z.boolean().default(true),
  questions: z.array(z.preprocess(questionItemPreprocessor, importQuestionSchema)).min(1, 'At least one question is required')
});

export async function importPaperWithQuestions(rawInput) {
  const payload = rawInput?.paper ? { ...rawInput.paper, questions: rawInput.questions } : rawInput;
  const parsed = importPaperSchema.parse(payload);

  const profile = await ExamProfile.findOne({ key: parsed.examKey }).lean();
  if (!profile) {
    throw new AppError('EXAM_PROFILE_NOT_FOUND', `Exam profile '${parsed.examKey}' was not found.`, 404);
  }

  let taxonomy = null;
  try {
    taxonomy = await loadTaxonomy();
  } catch {
    // Proceed without taxonomy if file missing
  }

  const seenQNos = new Set();
  let nextQNo = 1;
  const preparedQuestions = [];

  for (const q of parsed.questions) {
    let qNo = q.qNo;
    if (!qNo) {
      while (seenQNos.has(nextQNo)) nextQNo += 1;
      qNo = nextQNo++;
    }
    if (seenQNos.has(qNo)) {
      throw new AppError('DUPLICATE_QUESTION_NUMBER', `Duplicate qNo ${qNo} in question list.`, 400);
    }
    seenQNos.add(qNo);

    let section = q.section;
    let category = q.category;
    let subcategory = q.subcategory;

    if (taxonomy) {
      const norm = normalizeTags({ section, category, subcategory, qNo }, taxonomy);
      section = norm.section;
      category = norm.category;
      subcategory = norm.subcategory;
    }

    const reviewReasons = new Set(q.reviewReasons || []);
    if (!q.correctOption) reviewReasons.add('missing answer');
    if (['A', 'B', 'C', 'D'].some((key) => !q.options?.[key]?.trim())) reviewReasons.add('missing/empty option');
    if (q.hasFigure) reviewReasons.add('figure/formula');

    const needsReview = q.needsReview !== undefined ? q.needsReview : reviewReasons.size > 0;
    const verified = q.verified !== undefined ? q.verified : (parsed.autoApprove && !needsReview);

    preparedQuestions.push({
      examKey: parsed.examKey,
      qNo,
      section,
      category,
      subcategory,
      difficulty: q.difficulty,
      difficultySource: q.difficultySource,
      language: q.language,
      text: q.text,
      options: q.options,
      correctOption: q.correctOption,
      explanation: q.explanation || '',
      hasFigure: Boolean(q.hasFigure),
      figurePath: q.figurePath || '',
      sourcePage: 1,
      confidence: q.confidence,
      needsReview,
      reviewReasons: [...reviewReasons],
      origin: 'extracted',
      verified,
      stats: { attempts: 0, correct: 0, avgTimeSec: 0 }
    });
  }

  preparedQuestions.sort((a, b) => a.qNo - b.qNo);

  const expectedCount = profile.totalQuestions || preparedQuestions.length;
  const missingQNos = findMissingQuestionNumbers(preparedQuestions, expectedCount);
  const needsReviewCount = preparedQuestions.filter((q) => q.needsReview).length;
  const verifiedCount = preparedQuestions.filter((q) => q.verified).length;

  const isApproved = parsed.autoApprove && needsReviewCount === 0 && verifiedCount === preparedQuestions.length;

  const paper = new Paper({
    examKey: parsed.examKey,
    title: parsed.title,
    examDate: parsed.examDate,
    shift: parsed.shift,
    originalFilename: 'import.json',
    pdfPath: '',
    totalPages: 0,
    status: isApproved ? 'approved' : 'review',
    progress: {
      chunksTotal: 0,
      chunksDone: 0,
      extractedChunks: [],
      failedChunks: [],
      activeChunks: [],
      retryPagesTotal: 0,
      retryPagesDone: 0
    },
    extractionStats: {
      found: preparedQuestions.length,
      expected: expectedCount,
      needsReview: needsReviewCount,
      missingQNos
    }
  });

  await paper.save();

  const questionsWithPaperId = preparedQuestions.map((q) => ({
    ...q,
    paperId: paper._id
  }));

  const inserted = await Question.insertMany(questionsWithPaperId);

  return {
    paper: await serializePaperWithChunks(paper),
    questionsCount: inserted.length,
    verifiedCount,
    needsReviewCount,
    missingQNos
  };
}

export async function addQuestionsToPaper(paperId, rawInput) {
  if (!mongoose.isValidObjectId(paperId)) throw new AppError('INVALID_PAPER_ID', 'Paper id is invalid.', 400);
  const paper = await Paper.findById(paperId);
  if (!paper) throw new AppError('PAPER_NOT_FOUND', 'Paper was not found.', 404);

  const profile = await ExamProfile.findOne({ key: paper.examKey }).lean();
  const rawList = Array.isArray(rawInput) ? rawInput : (rawInput?.questions || [rawInput]);
  if (!rawList.length) throw new AppError('VALIDATION_ERROR', 'At least one question is required.', 400);

  const existingQuestions = await Question.find({ paperId }).select('qNo').lean();
  const existingQNos = new Set(existingQuestions.map((q) => q.qNo));
  let maxQNo = existingQuestions.reduce((max, q) => Math.max(max, q.qNo), 0);

  let taxonomy = null;
  try { taxonomy = await loadTaxonomy(); } catch {}

  const prepared = [];
  for (const rawItem of rawList) {
    const q = importQuestionSchema.parse(questionItemPreprocessor(rawItem));
    let qNo = q.qNo;
    if (!qNo) {
      maxQNo += 1;
      qNo = maxQNo;
    }
    if (existingQNos.has(qNo)) {
      throw new AppError('DUPLICATE_QUESTION_NUMBER', `qNo ${qNo} already exists in paper ${paperId}.`, 409);
    }
    existingQNos.add(qNo);

    let section = q.section;
    let category = q.category;
    let subcategory = q.subcategory;
    if (taxonomy) {
      const norm = normalizeTags({ section, category, subcategory, qNo }, taxonomy);
      section = norm.section;
      category = norm.category;
      subcategory = norm.subcategory;
    }

    const reviewReasons = new Set(q.reviewReasons || []);
    if (!q.correctOption) reviewReasons.add('missing answer');
    if (['A', 'B', 'C', 'D'].some((key) => !q.options?.[key]?.trim())) reviewReasons.add('missing/empty option');
    if (q.hasFigure) reviewReasons.add('figure/formula');

    const needsReview = q.needsReview !== undefined ? q.needsReview : reviewReasons.size > 0;
    const verified = q.verified !== undefined ? q.verified : !needsReview;

    prepared.push({
      paperId: paper._id,
      examKey: paper.examKey,
      qNo,
      section,
      category,
      subcategory,
      difficulty: q.difficulty,
      difficultySource: q.difficultySource,
      language: q.language,
      text: q.text,
      options: q.options,
      correctOption: q.correctOption,
      explanation: q.explanation || '',
      hasFigure: Boolean(q.hasFigure),
      figurePath: q.figurePath || '',
      sourcePage: 1,
      confidence: q.confidence,
      needsReview,
      reviewReasons: [...reviewReasons],
      origin: 'extracted',
      verified,
      stats: { attempts: 0, correct: 0, avgTimeSec: 0 }
    });
  }

  const inserted = await Question.insertMany(prepared);

  const allQuestions = await Question.find({ paperId }).select('qNo needsReview verified').lean();
  const expectedCount = profile?.totalQuestions || allQuestions.length;
  const missingQNos = findMissingQuestionNumbers(allQuestions, expectedCount);
  const needsReviewCount = allQuestions.filter((q) => q.needsReview).length;

  paper.extractionStats = {
    found: allQuestions.length,
    expected: expectedCount,
    needsReview: needsReviewCount,
    missingQNos
  };
  await paper.save();

  return {
    paper: await serializePaperWithChunks(paper),
    addedCount: inserted.length,
    totalQuestions: allQuestions.length
  };
}
