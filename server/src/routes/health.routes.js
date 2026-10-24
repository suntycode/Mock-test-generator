import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  if (!ready) {
    return res.status(503).json({ ok: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'MongoDB is disconnected' } });
  }
  return res.json({ ok: true, data: { status: 'ok', database: 'connected' } });
});

export default router;
