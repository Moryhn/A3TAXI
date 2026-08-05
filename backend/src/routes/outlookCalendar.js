import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import {
    findAdminById, setOutlookOauthState, findAdminByOutlookOauthState, setOutlookTokens, clearOutlookTokens,
} from '../models/adminUser.js';
import { buildAuthUrl, exchangeCodeForTokens, getValidAccessToken, fetchEvents } from '../services/outlookCalendar.js';

const router = Router();

router.get('/status', requireAuth('admin'), async (req, res) => {
    const admin = await findAdminById(req.user.sub);
    res.json({ connected: !!admin.outlook_refresh_token });
});

router.get('/connect', requireAuth('admin'), async (req, res) => {
    const state = crypto.randomBytes(24).toString('base64url');
    await setOutlookOauthState(req.user.sub, state);
    res.json({ authUrl: buildAuthUrl(state) });
});

// Public — Microsoft redirects the browser here directly after consent, with
// no A3TAXI session/JWT attached. `state` (set in /connect) is the only way
// to know which admin this belongs to.
router.get('/callback', async (req, res) => {
    const { code, state, error, error_description: errorDescription } = req.query;
    if (error) {
        return res.status(400).send(`Outlook connection failed: ${errorDescription || error}`);
    }

    const admin = await findAdminByOutlookOauthState(state);
    if (!admin) {
        return res.status(400).send('Outlook connection failed: unrecognized or expired request. Please try connecting again.');
    }

    try {
        const tokens = await exchangeCodeForTokens(code);
        await setOutlookTokens(admin.id, {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        });
    } catch (err) {
        console.error('Outlook token exchange failed:', err.message);
        return res.status(502).send('Outlook connection failed while finishing the sign-in. Please try again.');
    }

    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    res.redirect(`${frontendUrl}/A3TAXI/#/admin/reservations?outlook=connected`);
});

router.get('/events', requireAuth('admin'), async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end query params are required' });

    const admin = await findAdminById(req.user.sub);
    if (!admin.outlook_refresh_token) return res.status(409).json({ error: 'Outlook is not connected' });

    const accessToken = await getValidAccessToken(admin);
    const events = await fetchEvents(accessToken, start, end);
    res.json(events);
});

router.post('/disconnect', requireAuth('admin'), async (req, res) => {
    await clearOutlookTokens(req.user.sub);
    res.status(204).end();
});

export default router;
