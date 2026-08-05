import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { saveSubscription, deleteSubscriptionByEndpoint } from '../models/pushSubscriptions.js';

const router = Router();

router.get('/vapid-public-key', requireAuth('admin', 'driver'), (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

router.post('/subscribe', requireAuth('admin', 'driver'), async (req, res) => {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys) {
        return res.status(400).json({ error: 'subscription with endpoint and keys is required' });
    }
    const owner = req.user.role === 'admin' ? { adminId: req.user.sub } : { driverId: req.user.sub };
    await saveSubscription(owner, subscription);
    res.status(201).json({ ok: true });
});

router.post('/unsubscribe', requireAuth('admin', 'driver'), async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });
    await deleteSubscriptionByEndpoint(endpoint);
    res.json({ ok: true });
});

export default router;
