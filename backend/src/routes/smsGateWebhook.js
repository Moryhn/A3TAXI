import { Router } from 'express';
import { verifyWebhookSignature } from '../services/smsGateWebhook.js';
import {
    createInboundMessageOnce, findJobForReplyByPhone, findRecentPhoneConversation, last10Digits,
} from '../models/jobMessage.js';
import { sendJobMessageNotification } from '../services/push.js';

const router = Router();

const ACTIVE_STATUSES = ['pending', 'accepted'];

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

    // A reply belongs either to a dispatch job (active, or completed in the
    // last week) or to a phone-number conversation a driver started without
    // a job. An active job always wins; otherwise whichever was written to
    // most recently.
    const job = await findJobForReplyByPhone(payload.sender);
    const phoneConvo = await findRecentPhoneConversation(payload.sender);

    let target = null;
    let driverId = null;
    let label = '';
    const useJob = job && (ACTIVE_STATUSES.includes(job.status) || !phoneConvo || new Date(job.updated_at) >= new Date(phoneConvo.created_at));
    if (useJob) {
        target = { jobId: job.id };
        driverId = job.driver_id;
        label = `job ${job.id} (${job.status})`;
    } else if (phoneConvo) {
        target = { driverId: phoneConvo.driver_id, phone: payload.sender };
        driverId = phoneConvo.driver_id;
        label = `phone conversation of driver ${phoneConvo.driver_id}`;
    }

    // Nothing to attach it to (cancelled, completed over a week ago, or a
    // number nobody here has written to) — dropped rather than stored orphaned.
    if (!target) {
        console.log(`SMS Gate webhook: no matching job or conversation for sender ${payload.sender}, dropping reply`);
        return res.status(200).json({ ok: true });
    }

    const saved = await createInboundMessageOnce(target, payload.message);
    if (!saved) {
        console.log(`SMS Gate webhook: duplicate delivery for ${label}, skipped`);
        return res.status(200).json({ ok: true });
    }
    console.log(`SMS Gate webhook: reply stored on ${label}`);

    if (driverId) {
        const notificationTag = target.jobId != null ? target.jobId : `phone-${last10Digits(payload.sender)}`;
        sendJobMessageNotification(driverId, notificationTag, payload.message)
            .catch((err) => console.error('sendJobMessageNotification failed:', err.message));
    }

    res.status(200).json({ ok: true });
});

export default router;
