import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { saveSubscription, deleteSubscriptionByEndpoint } from '../models/pushSubscriptions.js';

const router = Router();

router.get('/vapid-public-key', requireAuth('driver'), (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

router.post('/subscribe', requireAuth('driver'), async (req, res) => {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys) {
        return res.status(400).json({ error: 'subscription with endpoint and keys is required' });
    }
    await saveSubscription(req.user.sub, subscription);
    res.status(201).json({ ok: true });
});

router.post('/unsubscribe', requireAuth('driver'), async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });
    await deleteSubscriptionByEndpoint(endpoint);
    res.json({ ok: true });
});

export default router;
