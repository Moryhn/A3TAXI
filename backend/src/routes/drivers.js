import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { listDrivers, createDriver } from '../models/driver.js';

const router = Router();

router.get('/', requireAuth('admin'), async (req, res) => {
    const drivers = await listDrivers();
    res.json(drivers);
});

router.post('/', requireAuth('admin'), async (req, res) => {
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const accessCode = `DRV-${crypto.randomInt(1000, 9999)}`;
    const driver = await createDriver({ name, phone, accessCode });
    res.status(201).json(driver);
});

export default router;
