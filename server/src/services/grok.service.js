import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import TokenUsage from '../models/TokenUsage.js';
import { extractPrompt } from '../prompts/extract.prompt.js';
import { tagPrompt } from '../prompts/tag.prompt.js';
import { generatePrompt, solveGeneratedPrompt } from '../prompts/generate.prompt.js';
import {
  validateExtractedQuestions,
  validateTaggedQuestions,
  taggedQuestionsSchema,
  generatedQuestionSchema,
  solvedQuestionSchema
} from './gemini.service.js';

function cleanJsonText(raw) {
  let text = String(raw || '').trim();
  // 1. Prefer explicit ```json ... ``` block
  const jsonBlock = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonBlock) {
    return jsonBlock[1].trim();
  }
  // 2. Next check any fenced block containing JSON
  const anyBlock = text.match(/```\s*([\s\S]*?)\s*```/i);
  if (anyBlock && (anyBlock[1].trim().startsWith('{') || anyBlock[1].trim().startsWith('['))) {
    return anyBlock[1].trim();
  }
  // 3. Extract substring between first JSON opening character and matching closing character
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIdx = -1;
  let endChar = '}';
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endChar = '}';
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endChar = ']';
  }
  if (startIdx !== -1) {
    const lastIdx = text.lastIndexOf(endChar);
    if (lastIdx > startIdx) {
      return text.slice(startIdx, lastIdx + 1).trim();
    }
  }
  return text;
}

export function getProviderConfig() {
  const apiKey = env.GROK_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY || '';
  if (!apiKey) {
    throw new Error('Fallback AI key (GROK_API_KEY or GROQ_API_KEY or XAI_API_KEY) is not configured in server/.env.');
  }

  // Auto-detect provider based on key prefix or custom URL
  const isGroq = apiKey.startsWith('gsk_') || (env.GROK_BASE_URL && env.GROK_BASE_URL.includes('groq.com'));

  let baseUrl = env.GROK_BASE_URL;
  if (!baseUrl || baseUrl === 'https://api.x.ai/v1') {
    baseUrl = isGroq ? 'https://api.groq.com/openai/v1' : 'https://api.x.ai/v1';
  }

  let model = env.GROK_MODEL;
  if (isGroq && (!model || model.includes('grok'))) {
    model = 'qwen/qwen3.8-27b';
  } else if (!isGroq && (!model || model.includes('qwen') || model.includes('llama'))) {
    model = 'grok-2-vision-1212';
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ''),
    model,
    providerName: isGroq ? 'Groq' : 'xAI Grok'
  };
}

export async function callGrok({ messages, operation, schema, parseFn, context = {} }) {
  const config = getProviderConfig();

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      logger.info(
        { operation, provider: config.providerName, model: config.model, attempt },
        `Calling fallback AI service (${config.providerName})`
      );

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0,
          max_tokens: 16384
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`${config.providerName} API error HTTP ${response.status}: ${errorText}`);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error(`${config.providerName} returned an empty response.`);

      // Record token usage if database connected
      if (data.usage && mongoose.connection.readyState === 1) {
        TokenUsage.create({
          paperId: context.paperId,
          chunk: context.chunk,
          callType: operation,
          attempt,
          promptTokenCount: data.usage.prompt_tokens || 0,
          candidatesTokenCount: data.usage.completion_tokens || 0,
          thoughtsTokenCount: 0,
          totalTokenCount: data.usage.total_tokens || 0,
          model: config.model
        }).catch((err) => logger.warn({ err: err.message }, `Failed to record ${config.providerName} TokenUsage`));
      }

      logger.info(
        { operation, provider: config.providerName, model: config.model, usage: data.usage },
        `${config.providerName} call completed successfully`
      );

      const cleaned = cleanJsonText(content);
      const parsed = JSON.parse(cleaned);

      if (typeof parseFn === 'function') {
        return parseFn(parsed);
      }
      if (schema) {
        return schema.parse(parsed);
      }
      return parsed;
    } catch (err) {
      const is429 = err.status === 429;
      const isRetryable =
        is429 ||
        err.status >= 500 ||
        ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'ENOTFOUND'].includes(err.code);

      if (!isRetryable || attempt === maxAttempts) {
        logger.error({ operation, provider: config.providerName, attempt, err: err.message }, `${config.providerName} request failed`);
        throw err;
      }

      let delay = 2000 * Math.pow(2, attempt - 1);
      if (is429 && typeof err.message === 'string') {
        const matchSec = err.message.match(/try again in (\d+(?:\.\d+)?)\s*s/i) || err.message.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
        if (matchSec) {
          const parsedSec = Math.ceil(parseFloat(matchSec[1]));
          delay = Math.min(Math.max((parsedSec + 1) * 1000, 3000), 30000);
        } else {
          delay = 10000;
        }
      }

      logger.warn({ operation, provider: config.providerName, attempt, delay }, `Retrying ${config.providerName} request`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`${config.providerName} request failed after retries.`);
}

export function extractQuestionsFromPageImagesWithGrok(images, context = {}) {
  const systemPrompt =
    'You are an expert exam question extraction system. Extract exam questions from the provided images. Return ONLY a valid JSON array of question objects matching the required schema without explanation or markdown.';

  const userContent = [
    {
      type: 'text',
      text: `${extractPrompt}\n\nIMPORTANT: Return ONLY a valid JSON array of questions, for example: [{"q_no": 1, "section": "General Awareness", ...}]`
    },
    ...images.map((img) => ({
      type: 'image_url',
      image_url: {
        url: `data:image/png;base64,${img.toString('base64')}`
      }
    }))
  ];

  return callGrok({
    operation: 'extract',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    parseFn: (parsed) => {
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.questions)
        ? parsed.questions
        : Array.isArray(parsed?.items)
        ? parsed.items
        : Object.values(parsed);
      return validateExtractedQuestions(list);
    },
    context
  });
}

export function tagQuestionBatchWithGrok(questions, taxonomy, context = {}) {
  const prompt = tagPrompt.replace('{{taxonomy_json}}', JSON.stringify(taxonomy));
  const input = JSON.stringify(
    questions.map(({ qNo, section, text, options, correctOption, language }) => ({
      q_no: qNo,
      section,
      question_text: text,
      options,
      correct_option: correctOption,
      language
    }))
  );

  return callGrok({
    operation: 'tag',
    messages: [
      {
        role: 'system',
        content:
          'You are an exam taxonomy tagger. Return ONLY a valid JSON array of tagged question objects matching the schema.'
      },
      {
        role: 'user',
        content: `${prompt}\n\nQUESTIONS (preserve this order):\n${input}\n\nReturn JSON array: [{"section": "...", "category": "...", "subcategory": "...", "difficulty": "...", "explanation": "...", "answer_check": {...}}]`
      }
    ],
    parseFn: (parsed) => {
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.tagged_questions)
        ? parsed.tagged_questions
        : Array.isArray(parsed?.items)
        ? parsed.items
        : Object.values(parsed);
      return validateTaggedQuestions(list);
    },
    context
  });
}

export function generateQuestionWithGrok(input) {
  const schemaExample = JSON.stringify({
    question_text: "यदि किसी संख्या का 20% 80 है, तो वह संख्या क्या है?",
    options: {
      A: "300",
      B: "400",
      C: "500",
      D: "600"
    },
    correct_option: "B",
    language: input.language || "hi",
    difficulty: input.difficulty || "medium"
  });

  return callGrok({
    operation: 'generate',
    messages: [
      {
        role: 'system',
        content: `You are an exam question generator. Return ONLY a valid JSON object matching this EXACT format without markdown or explanation:\n${schemaExample}`
      },
      {
        role: 'user',
        content: `${generatePrompt}\n\nREQUEST:\n${JSON.stringify(input)}`
      }
    ],
    parseFn: (parsed) => {
      let options = parsed.options;
      if (Array.isArray(options)) {
        options = {
          A: String(options[0] ?? ''),
          B: String(options[1] ?? ''),
          C: String(options[2] ?? ''),
          D: String(options[3] ?? '')
        };
      }
      let correct = String(parsed.correct_option || '').toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(correct)) {
        const match = Object.entries(options || {}).find(([k, v]) => String(v).trim() === String(parsed.correct_option).trim());
        correct = match ? match[0] : 'A';
      }
      return generatedQuestionSchema.parse({
        question_text: parsed.question_text || parsed.text || parsed.question || '',
        options,
        correct_option: correct,
        language: ['hi', 'en', 'bilingual'].includes(parsed.language) ? parsed.language : (input.language || 'hi'),
        difficulty: ['easy', 'medium', 'hard'].includes(parsed.difficulty) ? parsed.difficulty : (input.difficulty || 'medium')
      });
    }
  });
}

export function solveGeneratedQuestionWithGrok(question) {
  return callGrok({
    operation: 'verify-generated',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert exam solver. Return ONLY a valid JSON object with format: {"correct_option": "A", "explanation": "..."} without markdown or explanation.'
      },
      {
        role: 'user',
        content: `${solveGeneratedPrompt}\n\nQUESTION:\n${JSON.stringify({
          question_text: question.question_text,
          options: question.options,
          language: question.language
        })}`
      }
    ],
    parseFn: (parsed) => {
      let correct = parsed.correct_option ? String(parsed.correct_option).toUpperCase() : null;
      if (correct && !['A', 'B', 'C', 'D'].includes(correct)) {
        correct = null;
      }
      return solvedQuestionSchema.parse({
        correct_option: correct,
        explanation: String(parsed.explanation || '')
      });
    }
  });
}
