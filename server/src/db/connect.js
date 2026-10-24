import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export async function connectDB() {
  await mongoose.connect(env.MONGO_URI);
  logger.info({ database: mongoose.connection.name }, 'Connected to MongoDB');
}
