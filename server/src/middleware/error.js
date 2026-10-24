import { logger } from '../config/logger.js';

export function notFound(req, res, next) {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` } });
}

export function errorHandler(err, req, res, _next) {
  const status = Number.isInteger(err.status) ? err.status : err.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  if (status >= 500) logger.error({ err, method: req.method, path: req.path }, 'Request failed');
  res.status(status).json({ ok: false, error: { code, message: status >= 500 && !err.code ? 'An unexpected error occurred' : err.message } });
}
