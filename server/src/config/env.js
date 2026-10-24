import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().url().default('mongodb://127.0.0.1:27017/mocktest'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GROK_API_KEY: z.string().default(''),
  GROK_MODEL: z.string().default('grok-2-vision-1212'),
  GROK_BASE_URL: z.string().default('https://api.x.ai/v1'),
  NVIDIA_API_KEY: z.string().default(''),
  NVIDIA_VISION_MODEL: z.string().default('meta/llama-3.2-11b-vision-instruct'),
  NVIDIA_TEXT_MODEL: z.string().default('meta/llama-3.2-11b-vision-instruct'),
  NVIDIA_BASE_URL: z.string().default('https://integrate.api.nvidia.com/v1'),
  STORAGE_DIR: z.string().default('../storage'),
  PAGES_PER_CHUNK: z.coerce.number().int().positive().default(3),
  EXTRACTION_CONCURRENCY: z.coerce.number().int().positive().default(2),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173')
});

const rawEnv = {
  ...process.env,
  GEMINI_API_KEY: (process.env.GEMINI_API_KEY || '').trim(),
  GROK_API_KEY: (process.env.GROK_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY || '').trim(),
  NVIDIA_API_KEY: (process.env.NVIDIA_API_KEY || process.env.NAVIDIA_KEY || process.env.NVIDIA_KEY || '').trim()
};

const parsed = envSchema.safeParse(rawEnv);
if (!parsed.success) {
  const details = parsed.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;
