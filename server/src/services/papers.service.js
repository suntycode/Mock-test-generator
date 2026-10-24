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
import { buildPageChunks } from '../utils/extraction.js';
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
