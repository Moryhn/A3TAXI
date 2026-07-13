import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { listDrivers, createDriver, updateDriver } from '../models/driver.js';

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

router.patch('/:id', requireAuth('admin'), async (req, res) => {
    const { name, phone, isActive } = req.body;
    const driver = await updateDriver(req.params.id, { name, phone, isActive });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
});

// Deactivates the driver rather than a hard delete, since their trip
// history stays referenced from past invoices.
router.delete('/:id', requireAuth('admin'), async (req, res) => {
    const driver = await updateDriver(req.params.id, { isActive: false });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
});

export default router;
