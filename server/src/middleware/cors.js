import { env } from '../config/env.js';

export function cors(req, res, next) {
  const origin = req.get('origin');

  // Allow env.CLIENT_ORIGIN or any local development origin (localhost or 127.0.0.1 on any port)
  const isAllowedOrigin =
    !origin ||
    origin === env.CLIENT_ORIGIN ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  if (isAllowedOrigin && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}
