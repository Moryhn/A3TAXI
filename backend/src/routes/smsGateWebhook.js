import { Router } from 'express';
import { verifyWebhookSignature } from '../services/smsGateWebhook.js';
import { createInboundMessage, findActiveJobByPhone } from '../models/jobMessage.js';
import { sendJobMessageNotification } from '../services/push.js';

const router = Router();

// Public — called only by SMS Gate itself, never a logged-in user. Protected
// by the HMAC signature (see services/smsGateWebhook.js), not requireAuth.
router.post('/webhook', async (req, res) => {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    if (!req.rawBody || !verifyWebhookSignature(req.rawBody.toString('utf8'), timestamp, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body || {};
    if (event !== 'sms:received' || !payload?.sender || !payload?.message) {
        return res.status(200).json({ ok: true });
    }

    // No job matches (already completed/cancelled, or a reply to a number
    // that was never dispatched) — nothing to attach it to, so it's dropped
    // rather than stored orphaned. A conversation only makes sense tied to
    // the active course it's about.
    const job = await findActiveJobByPhone(payload.sender);
    if (!job) {
        console.log(`SMS Gate webhook: no active job for sender ${payload.sender}, dropping reply`);
        return res.status(200).json({ ok: true });
    }

    await createInboundMessage(job.id, payload.message);
    if (job.driver_id) {
        sendJobMessageNotification(job.driver_id, job.id, payload.message)
            .catch((err) => console.error('sendJobMessageNotification failed:', err.message));
    }

    res.status(200).json({ ok: true });
});

export default router;
