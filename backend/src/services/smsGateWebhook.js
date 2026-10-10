import crypto from 'crypto';

const { SMS_GATE_BASE_URL, SMS_GATE_USERNAME, SMS_GATE_PASSWORD, SMS_GATE_WEBHOOK_SECRET, PUBLIC_API_URL } = process.env;

// HMAC-SHA256 over (raw body + timestamp), per SMS Gate's webhook signing
// scheme — https://docs.sms-gate.app/features/webhooks/. The secret lives in
// the SMS Gate app itself (Settings → Webhooks → Signing Key), pasted into
// this env var by the admin — never something this codebase can generate.
export function verifyWebhookSignature(rawBody, timestamp, signature) {
    if (!SMS_GATE_WEBHOOK_SECRET || !timestamp || !signature) return false;
    const expected = crypto
        .createHmac('sha256', SMS_GATE_WEBHOOK_SECRET)
        .update(rawBody + timestamp)
        .digest('hex');
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

// Idempotent: lists SMS Gate's currently registered webhooks and only
// creates ours if it's missing. Safe to call on every server boot — Render's
// free tier restarts/sleeps often, and re-registering an identical webhook
// on every boot would otherwise pile up duplicates (one delivery per
// duplicate = one job_messages row per duplicate for every real reply).
// Errors are logged and swallowed so a misconfigured or unreachable SMS Gate
// never blocks the server from starting.
export async function ensureWebhookRegistered() {
    if (!SMS_GATE_BASE_URL || !SMS_GATE_USERNAME || !SMS_GATE_PASSWORD || !PUBLIC_API_URL) return;

    const baseUrl = SMS_GATE_BASE_URL.replace(/\/$/, '');
    const auth = Buffer.from(`${SMS_GATE_USERNAME}:${SMS_GATE_PASSWORD}`).toString('base64');
    const webhookUrl = `${PUBLIC_API_URL.replace(/\/$/, '')}/api/sms-gate/webhook`;

    try {
        const listRes = await fetch(`${baseUrl}/webhooks`, {
            headers: { Authorization: `Basic ${auth}` },
        });
        // If listing fails we can't know whether ours exists — registering
        // anyway would pile up a duplicate (every duplicate delivers every
        // reply again), so bail out and let the next boot retry.
        if (!listRes.ok) {
            throw new Error(`could not list SMS Gate webhooks (status ${listRes.status})`);
        }
        const existing = await listRes.json();
        const ours = Array.isArray(existing)
            ? existing.filter((w) => w.url === webhookUrl && w.event === 'sms:received')
            : [];
        if (ours.length > 0) {
            if (ours.length > 1) {
                console.warn(`SMS Gate: ${ours.length} duplicate webhooks registered for ${webhookUrl} — each reply is delivered ${ours.length} times`);
            }
            return;
        }

        const createRes = await fetch(`${baseUrl}/webhooks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
            body: JSON.stringify({ url: webhookUrl, event: 'sms:received' }),
        });
        if (!createRes.ok) {
            throw new Error(`SMS Gate webhook registration failed with status ${createRes.status}: ${await createRes.text()}`);
        }
        console.log(`SMS Gate webhook registered: ${webhookUrl}`);
    } catch (err) {
        console.error('SMS Gate webhook registration failed:', err.message);
    }
}
