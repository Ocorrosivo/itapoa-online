import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { pool } from '../mysql.js';
import { paymentService, PaymentError } from '../services/paymentService.js';

/** Delivery journal, not a background queue: acknowledge only after processing.
 * Gateway timeouts and DB failures return 503 so Mercado Pago redelivers. */
export async function mercadoPagoWebhook(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  const id = req.query['data.id'];
  const signature = req.header('x-signature');
  const requestId = req.header('x-request-id');
  // Sign the actual query parameter, never an unsigned body/fallback identifier.
  if (typeof id !== 'string' || !paymentService.verifyWebhookSignature(signature, requestId, id)) {
    console.warn('[webhook] invalid_signature');
    return res.status(401).json({ received: false, error: 'invalid signature' });
  }
  const topic = req.body?.type || req.query.type || req.query.topic;
  if (topic !== 'payment') return res.status(200).json({ received: true, ignored: true });
  if (req.body?.data?.id != null && String(req.body.data.id) !== id) return res.status(400).json({ received: false, error: 'conflicting identifiers' });
  try {
    // Keep only the resource signal. Never store customer payloads or full signatures.
    await pool.query(`INSERT INTO webhook_events (id, gateway, gateway_event_id, topic, raw_body, signature_header, request_id, status)
      VALUES (?, 'mercadopago', ?, 'payment', ?, NULL, ?, 'pending')
      ON DUPLICATE KEY UPDATE updated_at=UTC_TIMESTAMP()`,
      ['evt_' + crypto.randomUUID(), id, JSON.stringify({ data: { id } }), requestId]);
    await pool.query("UPDATE webhook_events SET status='processing', attempts=attempts+1 WHERE gateway='mercadopago' AND gateway_event_id=?", [id]);
    const result = await paymentService.handlePaymentNotification(id);
    await pool.query("UPDATE webhook_events SET status='done', last_error=NULL WHERE gateway='mercadopago' AND gateway_event_id=?", [id]);
    return res.status(200).json({ received: true, ignored: result.status === 'ignored' });
  } catch (error) {
    const permanent = error instanceof PaymentError && error.status === 422;
    const reason = permanent ? 'payment_validation_failed' : 'processing_unavailable';
    console.error('[webhook]', reason);
    await pool.query("UPDATE webhook_events SET status='failed', last_error=? WHERE gateway='mercadopago' AND gateway_event_id=?", [reason, id]).catch(() => {});
    return res.status(permanent ? 422 : 503).json({ received: false, error: reason });
  }
}
