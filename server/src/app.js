import express from 'express';
import healthRoutes from './routes/health.routes.js';
import papersRoutes from './routes/papers.routes.js';
import questionsRoutes from './routes/questions.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import blueprintsRoutes from './routes/blueprints.routes.js';
import mocktestsRoutes from './routes/mocktests.routes.js';
import attemptsRoutes from './routes/attempts.routes.js';
import { cors } from './middleware/cors.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();
app.use(cors);
app.use(express.json());
app.use('/api/health', healthRoutes);
app.use('/api/papers', papersRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/blueprints', blueprintsRoutes);
app.use('/api/mocktests', mocktestsRoutes);
app.use('/api/attempts', attemptsRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
