import { Router } from 'express';
import { passwordRecoveryService, RecoveryError } from '../services/passwordRecoveryService.js';

export const passwordRecoveryRouter = Router();
passwordRecoveryRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
passwordRecoveryRouter.get('/recovery-status', async (_req, res) => {
  res.json({ available: await passwordRecoveryService.available() });
});
for (const action of ['forgot-password', 'reset-password'] as const) {
  passwordRecoveryRouter.post(`/${action}`, async (req, res) => {
    try {
      const result = action === 'forgot-password'
        ? await passwordRecoveryService.request(req.body?.email, req.ip || req.socket.remoteAddress || 'unknown')
        : await passwordRecoveryService.reset(req.body?.token, req.body?.password);
      res.status(action === 'forgot-password' ? 202 : 200).json(result);
    } catch (error) {
      if (error instanceof RecoveryError) {
        if (error.status === 429) res.setHeader('Retry-After', '3600');
        res.status(error.status).json({ error: error.message });
      } else {
        // No SQL, input data, SMTP details or tokens in logs/responses.
        console.error('[password-recovery] operation_failed');
        res.status(503).json({ error: 'Recuperação temporariamente indisponível. Tente mais tarde ou contate o suporte.' });
      }
    }
  });
}
