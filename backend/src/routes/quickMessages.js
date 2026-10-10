import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listButtons, getButton, createButton, updateButton, deleteButton, createLog, listLogs } from '../models/quickMessage.js';
import { findDispatchJobById } from '../models/dispatch.js';
import { sendSms } from '../services/sms.js';

const router = Router();

// The text actually texted to the customer. {lien} marks where the button's
// link goes; if the message doesn't use it, a configured link is still sent
// (added at the end) unless the admin already typed that link into the text —
// a filled-in link field that silently never gets sent is the trap this avoids.
// Mirrored in frontend/src/lib/quickMessage.js so the admin preview and the
// driver's confirmation show exactly what will be sent.
function composeMessage(button) {
    const template = button.message_template || '';
    const link = (button.google_review_link || '').trim();
    if (template.includes('{lien}')) return template.replaceAll('{lien}', link);
    if (link && !template.includes(link)) return `${template}\n\n${link}`;
    return template;
}

router.get('/buttons', requireAuth('admin', 'driver'), async (req, res) => {
    res.json(await listButtons());
});

router.post('/buttons', requireAuth('admin'), async (req, res) => {
    res.status(201).json(await createButton());
});

router.patch('/buttons/:position', requireAuth('admin'), async (req, res) => {
    const position = Number(req.params.position);
    if (!Number.isInteger(position) || position < 1) {
        return res.status(400).json({ error: 'position must be a positive integer' });
    }
    const { label, messageTemplate, googleReviewLink, isActive } = req.body;
    const button = await updateButton(position, { label, messageTemplate, googleReviewLink, isActive });
    if (!button) return res.status(404).json({ error: 'Button not found' });
    res.json(button);
});

router.delete('/buttons/:position', requireAuth('admin'), async (req, res) => {
    const deleted = await deleteButton(Number(req.params.position));
    if (!deleted) return res.status(404).json({ error: 'Button not found' });
    res.status(204).end();
});

// jobId is optional — drivers also pick up rides outside the app (direct
// calls, regulars), so sending is never gated on a dispatch job existing.
// When one is supplied it's recorded for traceability, but its status isn't
// checked: a ride can be finished in reality without the driver having
// tapped "Terminer" in the app.
router.post('/send', requireAuth('driver'), async (req, res) => {
    const { phone, position, jobId } = req.body;
    if (!phone || phone.replace(/\D/g, '').length < 10) {
        return res.status(400).json({ error: 'A valid phone number with at least 10 digits is required' });
    }

    const button = await getButton(Number(position));
    if (!button) return res.status(404).json({ error: 'Button not found' });
    if (!button.is_active) return res.status(409).json({ error: 'This button is not active' });

    if (jobId) {
        const job = await findDispatchJobById(jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        if (job.driver_id !== req.user.sub) return res.status(403).json({ error: 'This job belongs to another driver' });
    }

    const message = composeMessage(button);
    let status = 'sent';
    let error = null;
    try {
        await sendSms(phone, message);
    } catch (err) {
        status = 'failed';
        error = err.message;
    }

    const log = await createLog({
        dispatchJobId: jobId || null,
        driverId: req.user.sub,
        buttonPosition: button.position,
        buttonLabel: button.label,
        customerPhone: phone,
        messageSent: message,
        status,
        error,
    });

    if (status === 'failed') return res.status(502).json({ error: `SMS failed: ${error}`, log });
    res.status(201).json(log);
});

router.get('/logs', requireAuth('admin'), async (req, res) => {
    res.json(await listLogs());
});

export default router;
