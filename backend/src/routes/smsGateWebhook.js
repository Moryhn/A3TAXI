import { Router } from 'express';
import { verifyWebhookSignature } from '../services/smsGateWebhook.js';
import { createInboundMessageOnce, findJobForReplyByPhone } from '../models/jobMessage.js';
import { sendJobMessageNotification } from '../services/push.js';

const router = Router();

// Public — called only by SMS Gate itself, never a logged-in user. Protected
// by the HMAC signature (see services/smsGateWebhook.js), not requireAuth.
router.post('/webhook', async (req, res) => {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    if (!req.rawBody || !verifyWebhookSignature(req.rawBody.toString('utf8'), timestamp, signature)) {
        // Logged (no secrets, no body) so a signing-key mismatch can't hide as
        // a silent 401 — the only trace would otherwise be SMS Gate's side.
        console.log(`SMS Gate webhook: rejected, invalid signature (X-Signature ${signature ? 'present' : 'missing'}, X-Timestamp ${timestamp ? 'present' : 'missing'})`);
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body || {};
    if (event !== 'sms:received' || !payload?.sender || !payload?.message) {
        console.log(`SMS Gate webhook: ignored event "${event}"`);
        return res.status(200).json({ ok: true });
    }

    // No job matches (cancelled, completed more than a week ago, or a reply
    // to a number that was never dispatched) — nothing to attach it to, so
    // it's dropped rather than stored orphaned.
    const job = await findJobForReplyByPhone(payload.sender);
    if (!job) {
        console.log(`SMS Gate webhook: no matching job for sender ${payload.sender}, dropping reply`);
        return res.status(200).json({ ok: true });
    }

    const saved = await createInboundMessageOnce(job.id, payload.message);
    if (!saved) {
        console.log(`SMS Gate webhook: duplicate delivery for job ${job.id}, skipped`);
        return res.status(200).json({ ok: true });
    }
    console.log(`SMS Gate webhook: reply stored on job ${job.id} (${job.status})`);

    if (job.driver_id) {
        sendJobMessageNotification(job.driver_id, job.id, payload.message)
            .catch((err) => console.error('sendJobMessageNotification failed:', err.message));
    }

    res.status(200).json({ ok: true });
});

export default router;
