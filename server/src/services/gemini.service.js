import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import TokenUsage from '../models/TokenUsage.js';
import { extractPrompt } from '../prompts/extract.prompt.js';
import { tagPrompt } from '../prompts/tag.prompt.js';
import { generatePrompt, solveGeneratedPrompt } from '../prompts/generate.prompt.js';
import {
  extractQuestionsFromPageImagesWithGrok,
  tagQuestionBatchWithGrok,
  generateQuestionWithGrok,
  solveGeneratedQuestionWithGrok
} from './grok.service.js';
import {
  extractQuestionsFromPageImagesWithNvidia,
  tagQuestionBatchWithNvidia,
  generateQuestionWithNvidia,
  solveGeneratedQuestionWithNvidia
} from './nvidia.service.js';

export const extractedQuestionSchema = z.object({
  q_no: z.number().int().positive(),
  section: z.string(),
  question_text: z.string().min(1),
  options: z.object({ A: z.string(), B: z.string(), C: z.string(), D: z.string() }),
  correct_option: z.enum(['A', 'B', 'C', 'D']).nullable(),
  has_figure_or_formula: z.boolean(),
  language: z.enum(['hi', 'en', 'bilingual']),
  confidence: z.number().min(0).max(1),
  page_number: z.number().int().positive()
});

export const extractedQuestionsSchema = z.array(extractedQuestionSchema);

export function validateExtractedQuestions(rawItems) {
  const items = Array.isArray(rawItems) ? rawItems : (rawItems && typeof rawItems === 'object' ? [rawItems] : []);
  const validOrSalvaged = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const parsed = extractedQuestionSchema.safeParse(item);
    if (parsed.success) {
      validOrSalvaged.push({ ...parsed.data, validationErrors: [] });
      continue;
    }
    const validationErrors = parsed.error.issues.map((i) => `${i.path.join('.') || 'question'}: ${i.message}`);
    const qNo = Number(item.q_no);
    if (!Number.isInteger(qNo) || qNo <= 0) {
      logger.warn({ item, validationErrors }, 'Discarded question without valid positive integer q_no');
      continue;
    }
    const rawOptions = item.options || {};
    const sanitized = {
      q_no: qNo,
      section: typeof item.section === 'string' && item.section.trim() ? item.section.trim() : 'General Awareness',
      question_text: typeof item.question_text === 'string' && item.question_text.trim() ? item.question_text : '[Question text missing or unreadable]',
      options: {
        A: String(rawOptions.A ?? rawOptions['1'] ?? '').trim(),
        B: String(rawOptions.B ?? rawOptions['2'] ?? '').trim(),
        C: String(rawOptions.C ?? rawOptions['3'] ?? '').trim(),
        D: String(rawOptions.D ?? rawOptions['4'] ?? '').trim()
      },
      correct_option: ['A', 'B', 'C', 'D'].includes(item.correct_option) ? item.correct_option : null,
      has_figure_or_formula: Boolean(item.has_figure_or_formula),
      language: ['hi', 'en', 'bilingual'].includes(item.language) ? item.language : 'hi',
      confidence: typeof item.confidence === 'number' && !isNaN(item.confidence) ? Math.min(1, Math.max(0, item.confidence)) : 0.5,
      page_number: Number.isInteger(item.page_number) && item.page_number > 0 ? item.page_number : 1,
      validationErrors
    };
    validOrSalvaged.push(sanitized);
  }
  return validOrSalvaged;
}

export const taggedQuestionSchema = z.object({
  section: z.string().optional().default('General Awareness'),
  category: z.string().nullable().optional().default('Other'),
  subcategory: z.string().nullable().optional().default('Other'),
  difficulty: z.enum(['easy', 'medium', 'hard']).catch('medium'),
  explanation: z.string().nullable().optional().default(''),
  answer_check: z.object({
    solved_option: z.enum(['A', 'B', 'C', 'D']).nullable().optional().default(null),
    mismatch: z.boolean().optional().default(false)
  }).nullable().optional().default(null)
});

export const taggedQuestionsSchema = z.array(taggedQuestionSchema);

export function validateTaggedQuestions(rawItems) {
  const items = Array.isArray(rawItems)
    ? rawItems
    : (rawItems && typeof rawItems === 'object' ? Object.values(rawItems) : []);
  return items.map((item) => {
    if (!item || typeof item !== 'object') {
      return {
        section: 'General Awareness',
        category: 'Other',
        subcategory: 'Other',
        difficulty: 'medium',
        explanation: '',
        answer_check: { solved_option: null, mismatch: false }
      };
    }
    const diff = String(item.difficulty || '').toLowerCase();
    const difficulty = ['easy', 'medium', 'hard'].includes(diff) ? diff : 'medium';

    let solvedOption = null;
    let mismatch = false;
    if (item.answer_check && typeof item.answer_check === 'object') {
      const opt = item.answer_check.solved_option;
      if (['A', 'B', 'C', 'D'].includes(opt)) {
        solvedOption = opt;
      }
      mismatch = Boolean(item.answer_check.mismatch);
    }

    return {
      section: typeof item.section === 'string' && item.section.trim() ? item.section.trim() : 'General Awareness',
      category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Other',
      subcategory: typeof item.subcategory === 'string' && item.subcategory.trim() ? item.subcategory.trim() : 'Other',
      difficulty,
      explanation: typeof item.explanation === 'string' ? item.explanation : '',
      answer_check: {
        solved_option: solvedOption,
        mismatch
      }
    };
  });
}
export const generatedQuestionSchema = z.object({
  question_text: z.string().min(1),
  options: z.object({ A: z.string().min(1), B: z.string().min(1), C: z.string().min(1), D: z.string().min(1) }),
  correct_option: z.enum(['A', 'B', 'C', 'D']),
  language: z.enum(['hi', 'en', 'bilingual']),
  difficulty: z.enum(['easy', 'medium', 'hard'])
});
export const solvedQuestionSchema = z.object({
  correct_option: z.enum(['A', 'B', 'C', 'D']).nullable(),
  explanation: z.string()
});

const extractedResponseSchema = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      q_no: { type: 'INTEGER' },
      section: { type: 'STRING' },
      question_text: { type: 'STRING' },
      options: {
        type: 'OBJECT',
        properties: { A: { type: 'STRING' }, B: { type: 'STRING' }, C: { type: 'STRING' }, D: { type: 'STRING' } },
        required: ['A', 'B', 'C', 'D']
      },
      correct_option: { type: 'STRING', enum: ['A', 'B', 'C', 'D'], nullable: true },
      has_figure_or_formula: { type: 'BOOLEAN' },
      language: { type: 'STRING', enum: ['hi', 'en', 'bilingual'] },
      confidence: { type: 'NUMBER' },
      page_number: { type: 'INTEGER' }
    },
    required: ['q_no', 'section', 'question_text', 'options', 'correct_option', 'has_figure_or_formula', 'language', 'confidence', 'page_number']
  }
};

const taggedResponseSchema = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      section: { type: 'STRING' },
      category: { type: 'STRING' },
      subcategory: { type: 'STRING' },
      difficulty: { type: 'STRING', enum: ['easy', 'medium', 'hard'] },
      explanation: { type: 'STRING', nullable: true },
      answer_check: {
        type: 'OBJECT',
        nullable: true,
        properties: {
          solved_option: { type: 'STRING', enum: ['A', 'B', 'C', 'D'], nullable: true },
          mismatch: { type: 'BOOLEAN' }
        },
        required: ['solved_option', 'mismatch']
      }
    },
    required: ['section', 'category', 'subcategory', 'difficulty', 'explanation', 'answer_check']
  }
};

const generatedResponseSchema = {
  type: 'OBJECT',
  properties: {
    question_text: { type: 'STRING' },
    options: {
      type: 'OBJECT',
      properties: { A: { type: 'STRING' }, B: { type: 'STRING' }, C: { type: 'STRING' }, D: { type: 'STRING' } },
      required: ['A', 'B', 'C', 'D']
    },
    correct_option: { type: 'STRING', enum: ['A', 'B', 'C', 'D'] },
    language: { type: 'STRING', enum: ['hi', 'en', 'bilingual'] },
    difficulty: { type: 'STRING', enum: ['easy', 'medium', 'hard'] }
  },
  required: ['question_text', 'options', 'correct_option', 'language', 'difficulty']
};

const solvedResponseSchema = {
  type: 'OBJECT',
  properties: {
    correct_option: { type: 'STRING', enum: ['A', 'B', 'C', 'D'], nullable: true },
    explanation: { type: 'STRING' }
  },
  required: ['correct_option', 'explanation']
};

let client;
function getClient() {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured in server/.env.');
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

function extractStatus(error) {
  if (error?.status) return Number(error.status);
  if (error?.statusCode) return Number(error.statusCode);
  if (error?.response?.status) return Number(error.response.status);
  if (typeof error?.message === 'string') {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.error?.code) return Number(parsed.error.code);
      if (parsed?.code) return Number(parsed.code);
    } catch {}
    const match = error.message.match(/code["']?\s*:\s*(\d{3})/i) || error.message.match(/\b(429|500|502|503|504)\b/);
    if (match) return Number(match[1]);
  }
  return null;
}

function isRetryable(error) {
  const status = extractStatus(error);
  if (status === 429 || (status !== null && status >= 500 && status < 600)) return true;
  const code = error?.code ?? error?.cause?.code;
  if (['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'ENOTFOUND'].includes(code)) return true;
  if (error instanceof TypeError && (error.message.includes('fetch failed') || error.message.includes('network'))) return true;
  if (typeof error?.message === 'string' && (error.message.includes('UNAVAILABLE') || error.message.includes('high demand') || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('quota exceeded'))) return true;
  return false;
}

export function isQuotaExceeded(error) {
  const status = extractStatus(error);
  if (status === 429) return true;
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('credit') ||
    msg.includes('billing') ||
    msg.includes('limit reached') ||
    msg.includes('exceeded') ||
    msg.includes('429')
  );
}

// Circuit breakers for quota exhaustion (cooldown for 5 minutes)
let geminiQuotaExhaustedUntil = 0;
let grokQuotaExhaustedUntil = 0;

export function isGeminiQuotaExhausted() {
  return Date.now() < geminiQuotaExhaustedUntil;
}

export function markGeminiQuotaExhausted(cooldownMs = 5 * 60 * 1000) {
  geminiQuotaExhaustedUntil = Date.now() + cooldownMs;
}

export function isGrokQuotaExhausted() {
  return Date.now() < grokQuotaExhaustedUntil;
}

export function markGrokQuotaExhausted(cooldownMs = 5 * 60 * 1000) {
  grokQuotaExhaustedUntil = Date.now() + cooldownMs;
}

function getRetryDelay(error, attempt) {
  if (typeof error?.message === 'string') {
    const matchSec = error.message.match(/retry in (\d+(?:\.\d+)?)\s*s/i) || error.message.match(/retryDelay["']?\s*:\s*["']?(\d+)s/i);
    if (matchSec) {
      const waitMs = Math.ceil(parseFloat(matchSec[1]) * 1000);
      if (waitMs > 0 && waitMs <= 30000) return waitMs;
    }
  }
  const baseMs = 1500 * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 500;
  return Math.min(baseMs + jitter, 30000);
}

async function withRetry(operation, request, context = {}) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await getClient().models.generateContent({
        model: env.GEMINI_MODEL,
        contents: request.contents,
        config: {
          temperature: 0,
          maxOutputTokens: 16384,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: request.responseSchema
        }
      });
      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;
      if (finishReason === 'MAX_TOKENS') {
        logger.warn({ operation, finishReason }, 'Gemini hit maxOutputTokens');
      }
      logger.info({ operation, model: env.GEMINI_MODEL, finishReason, usage: response.usageMetadata ?? null }, 'Gemini call completed');

      // Instrument token usage
      if (response.usageMetadata) {
        TokenUsage.create({
          paperId: context.paperId,
          chunk: context.chunk,
          callType: operation,
          attempt,
          promptTokenCount: response.usageMetadata.promptTokenCount || 0,
          candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
          thoughtsTokenCount: response.usageMetadata.thoughtsTokenCount || 0,
          totalTokenCount: response.usageMetadata.totalTokenCount || 0,
          model: env.GEMINI_MODEL
        }).catch((err) => logger.warn({ err: err.message }, 'Failed to record TokenUsage'));
      }

      if (!response.text) throw new Error('Gemini returned an empty response.');
      if (typeof request.parseFn === 'function') {
        return request.parseFn(response.text);
      }
      return request.schema.parse(JSON.parse(response.text));
    } catch (error) {
      if (isQuotaExceeded(error)) {
        throw error; // Let withFallback catch this immediately to trigger Grok auto-switch
      }
      const retryable = isRetryable(error);
      if (!retryable || attempt === maxAttempts) throw error;
      const delayMs = getRetryDelay(error, attempt);
      logger.warn({ operation, attempt, maxAttempts, delayMs, status: extractStatus(error) }, 'Retrying Gemini request');
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Gemini request failed after retries.');
}

async function withAutoSwitch(operation, geminiFn, grokFn, nvidiaFn) {
  const hasGemini = Boolean(env.GEMINI_API_KEY && !isGeminiQuotaExhausted());
  const hasGrok = Boolean(env.GROK_API_KEY && !isGrokQuotaExhausted());
  const hasNvidia = Boolean(env.NVIDIA_API_KEY);

  // 1. Try Primary: Google Gemini
  if (hasGemini) {
    try {
      return await geminiFn();
    } catch (error) {
      if (!isQuotaExceeded(error)) throw error;
      markGeminiQuotaExhausted();
      logger.warn(
        { operation, error: error.message },
        'Gemini credits/quota limit exceeded! Cascading to next available AI service...'
      );
    }
  }

  // 2. Try Secondary Fallback: Groq / Grok
  if (hasGrok && grokFn) {
    try {
      logger.info({ operation, fallbackModel: env.GROK_MODEL }, 'Routing request to Groq / Grok service...');
      return await grokFn();
    } catch (error) {
      if (!hasNvidia || !nvidiaFn) throw error;
      markGrokQuotaExhausted();
      logger.warn(
        { operation, error: error.message },
        'Groq / Grok service failed or limit reached! Cascading to NVIDIA NIM fallback...'
      );
    }
  }

  // 3. Try Tertiary Fallback: NVIDIA NIM
  if (hasNvidia && nvidiaFn) {
    logger.info({ operation, fallbackModel: env.NVIDIA_VISION_MODEL || env.NVIDIA_TEXT_MODEL }, 'Routing request to NVIDIA NIM service...');
    return await nvidiaFn();
  }

  throw new Error(`All configured AI providers (Gemini, Groq/Grok, NVIDIA NIM) are unavailable or exhausted for ${operation}.`);
}

export function extractQuestionsFromPageImages(images, context = {}) {
  return withAutoSwitch(
    'extract',
    () => {
      const contents = [extractPrompt, ...images.map((image) => ({ inlineData: { mimeType: 'image/png', data: image.toString('base64') } }))];
      return withRetry('extract', {
        contents,
        responseSchema: extractedResponseSchema,
        parseFn: (text) => {
          const json = JSON.parse(text);
          return validateExtractedQuestions(json);
        }
      }, context);
    },
    () => extractQuestionsFromPageImagesWithGrok(images, context),
    () => extractQuestionsFromPageImagesWithNvidia(images, context)
  );
}

export function tagQuestionBatch(questions, taxonomy, context = {}) {
  return withAutoSwitch(
    'tag',
    () => {
      const prompt = tagPrompt.replace('{{taxonomy_json}}', JSON.stringify(taxonomy));
      const input = JSON.stringify(questions.map(({ qNo, section, text, options, correctOption, language }) => ({
        q_no: qNo, section, question_text: text, options, correct_option: correctOption, language
      })));
      return withRetry('tag', { contents: `${prompt}\n\nQUESTIONS (preserve this order):\n${input}`, responseSchema: taggedResponseSchema, schema: taggedQuestionsSchema }, context);
    },
    () => tagQuestionBatchWithGrok(questions, taxonomy, context),
    () => tagQuestionBatchWithNvidia(questions, taxonomy, context)
  );
}

export function generateQuestion(input) {
  return withAutoSwitch(
    'generate',
    () => {
      const prompt = `${generatePrompt}\n\nREQUEST:\n${JSON.stringify(input)}`;
      return withRetry('generate', { contents: prompt, responseSchema: generatedResponseSchema, schema: generatedQuestionSchema });
    },
    () => generateQuestionWithGrok(input),
    () => generateQuestionWithNvidia(input)
  );
}

export function solveGeneratedQuestion(question) {
  return withAutoSwitch(
    'verify-generated',
    () => {
      const prompt = `${solveGeneratedPrompt}\n\nQUESTION:\n${JSON.stringify({
        section: question.section,
        category: question.category,
        subcategory: question.subcategory,
        question_text: question.question_text,
        options: question.options,
        language: question.language
      })}`;
      return withRetry('verify-generated', { contents: prompt, responseSchema: solvedResponseSchema, schema: solvedQuestionSchema });
    },
    () => solveGeneratedQuestionWithGrok(question),
    () => solveGeneratedQuestionWithNvidia(question)
  );
}
