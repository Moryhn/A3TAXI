import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
    recordDriverPosition,
    latestPositions,
    createDispatchJob,
    listDispatchJobsForDriver,
    updateDispatchJobStatus,
    listAllDispatchJobs,
    updateDispatchJob,
    deleteDispatchJob,
    assignDriverToJob,
    findDispatchJobByTrackingToken,
    latestPositionForDriver,
    findJobsDueForTrackingSms,
    markTrackingSmsSent,
} from '../models/dispatch.js';
import { sendJobNotification } from '../services/push.js';
import { getRideEstimate } from '../services/quote.js';
import { sendSms } from '../services/sms.js';

const router = Router();

async function sendTrackingSms(job) {
    const trackingUrl = `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/A3TAXI/#/track/${job.tracking_token}`;
    await sendSms(job.customer_phone, `Your A3TAXI driver is on the way! Track your ride live: ${trackingUrl}`);
    await markTrackingSmsSent(job.id);
}

// Driver app posts periodic GPS updates
router.post('/positions', requireAuth('driver'), async (req, res) => {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'lat and lng are required' });
    }
    const position = await recordDriverPosition(req.user.sub, lat, lng);
    res.status(201).json(position);
});

// Admin live map: latest position of every active driver
router.get('/positions', requireAuth('admin'), async (req, res) => {
    const positions = await latestPositions();
    res.json(positions);
});

const JOB_TYPES = ['ride', 'battery_boost', 'lockout'];

// Public "book now" request — customer submits pickup/dropoff/phone, no driver
// assigned yet. Shows up in the admin dispatch queue as unassigned until an
// admin picks a driver via PATCH /jobs/:id/assign.
router.post('/requests', async (req, res) => {
    const { pickupLocation, dropoffLocation, customerPhone } = req.body;
    if (!pickupLocation || !dropoffLocation || !customerPhone) {
        return res.status(400).json({ error: 'pickupLocation, dropoffLocation and customerPhone are required' });
    }

    // Recomputed server-side — never trust a client-supplied price.
    const quote = await getRideEstimate({
        pickupLocation, dropoffLocation, requestedTime: new Date().toISOString(), isRoundTrip: false, serviceType: 'ride',
    });

    const job = await createDispatchJob({
        address: pickupLocation,
        dropoffLocation,
        customerPhone,
        estimatedPrice: quote.estimatedPrice,
        jobType: 'ride',
    });
    res.status(201).json(job);
});

// Admin sends a job/address to a specific driver — also used to dispatch an
// already-confirmed reservation, which is why dropoffLocation/customerPhone/
// estimatedPrice are accepted here too (so the customer gets the same
// tracking SMS as a "book now" request once the driver accepts).
router.post('/jobs', requireAuth('admin'), async (req, res) => {
    const { driverId, address, notes, jobType, dropoffLocation, customerPhone, estimatedPrice, scheduledTime } = req.body;
    if (!driverId || !address) {
        return res.status(400).json({ error: 'driverId and address are required' });
    }
    if (jobType && !JOB_TYPES.includes(jobType)) {
        return res.status(400).json({ error: `jobType must be one of ${JOB_TYPES.join(', ')}` });
    }
    const job = await createDispatchJob({
        driverId, address, notes, assignedBy: req.user.sub, jobType, dropoffLocation, customerPhone, estimatedPrice, scheduledTime,
    });
    sendJobNotification(driverId, job).catch((err) => console.error('sendJobNotification failed:', err.message));
    res.status(201).json(job);
});

// Driver views their assigned jobs
router.get('/jobs', requireAuth('driver'), async (req, res) => {
    const jobs = await listDispatchJobsForDriver(req.user.sub, req.query.status);
    res.json(jobs);
});

// Admin view: every dispatched job across all drivers
router.get('/jobs/all', requireAuth('admin'), async (req, res) => {
    const jobs = await listAllDispatchJobs();
    res.json(jobs);
});

// Driver accepts/completes a job, or admin edits its address/notes
router.patch('/jobs/:id', requireAuth('admin', 'driver'), async (req, res) => {
    if (req.user.role === 'driver') {
        const { status } = req.body;
        if (!['accepted', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'status must be accepted, completed, or cancelled' });
        }
        const job = await updateDispatchJobStatus(req.params.id, status);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        // Jobs with no scheduled_time are "now" (book-now requests, ad-hoc
        // admin dispatches) — text immediately. Jobs scheduled ahead of time
        // (a reservation sent to a driver hours early) wait for the periodic
        // sweep below instead, so the customer isn't told "on the way" the
        // moment a driver accepts a job for tomorrow.
        if (status === 'accepted' && job.customer_phone && job.tracking_token && !job.scheduled_time) {
            sendTrackingSms(job).catch((err) => console.error('Tracking SMS failed:', err.message));
        }
        return res.json(job);
    }

    const { address, notes, jobType } = req.body;
    if (jobType && !JOB_TYPES.includes(jobType)) {
        return res.status(400).json({ error: `jobType must be one of ${JOB_TYPES.join(', ')}` });
    }
    const job = await updateDispatchJob(req.params.id, { address, notes, jobType });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});

// Admin assigns a driver to an unassigned "book now" request
router.patch('/jobs/:id/assign', requireAuth('admin'), async (req, res) => {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: 'driverId is required' });

    const job = await assignDriverToJob(req.params.id, driverId, req.user.sub);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    sendJobNotification(driverId, job).catch((err) => console.error('sendJobNotification failed:', err.message));
    res.json(job);
});

// Public "track my ride" page — looked up by unguessable token, never by id
router.get('/track/:token', async (req, res) => {
    const job = await findDispatchJobByTrackingToken(req.params.token);
    if (!job) return res.status(404).json({ error: 'Tracking link not found' });

    const position = job.driver_id ? await latestPositionForDriver(job.driver_id) : null;
    res.json({
        status: job.status,
        driverName: job.driver_name,
        pickupLocation: job.address,
        dropoffLocation: job.dropoff_location,
        position,
    });
});

// Pinged every few minutes by a GitHub Actions schedule (see
// .github/workflows/tracking-sms-cron.yml) — sends the "on the way" text for
// any accepted, scheduled job now within 10 minutes of pickup. Protected by
// a shared secret rather than admin auth since it's an unattended machine
// caller, not a logged-in admin.
router.post('/send-scheduled-tracking-sms', async (req, res) => {
    if (!process.env.CRON_SECRET || req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const jobs = await findJobsDueForTrackingSms();
    const results = await Promise.allSettled(jobs.map(sendTrackingSms));
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - sent;
    res.json({ checked: jobs.length, sent, failed });
});

// Admin removes a dispatched job
router.delete('/jobs/:id', requireAuth('admin'), async (req, res) => {
    await deleteDispatchJob(req.params.id);
    res.status(204).end();
});

export default router;
