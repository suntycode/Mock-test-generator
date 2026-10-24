import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB } from './db/connect.js';
import { seedInitialData } from './services/seed.service.js';
import { recoverInterruptedExtractions } from './services/extraction.service.js';
import app from './app.js';

try {
  await connectDB();
  const { profile } = await seedInitialData();
  await recoverInterruptedExtractions();
  logger.info({ examKey: profile.key }, 'Initial exam profile is ready');
  app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'Server listening'));
} catch (error) {
  logger.fatal({ err: error }, 'Server startup failed');
  process.exitCode = 1;
}
