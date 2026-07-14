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
} from '../models/dispatch.js';
import { sendJobNotification } from '../services/push.js';

const router = Router();

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

// Admin sends a job/address to a specific driver
router.post('/jobs', requireAuth('admin'), async (req, res) => {
    const { driverId, address, notes, jobType } = req.body;
    if (!driverId || !address) {
        return res.status(400).json({ error: 'driverId and address are required' });
    }
    if (jobType && !JOB_TYPES.includes(jobType)) {
        return res.status(400).json({ error: `jobType must be one of ${JOB_TYPES.join(', ')}` });
    }
    const job = await createDispatchJob({ driverId, address, notes, assignedBy: req.user.sub, jobType });
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

// Admin removes a dispatched job
router.delete('/jobs/:id', requireAuth('admin'), async (req, res) => {
    await deleteDispatchJob(req.params.id);
    res.status(204).end();
});

export default router;
