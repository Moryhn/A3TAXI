import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { listDrivers, createDriver, updateDriver, deleteDriver, findDriverById } from '../models/driver.js';
import { listLedgerEntries, getDriverBalance, addLedgerEntry, findLedgerEntryById, deleteLedgerEntry } from '../models/driverLedger.js';

const router = Router();

router.get('/', requireAuth('admin'), async (req, res) => {
    const drivers = await listDrivers();
    res.json(drivers);
});

// Driver views their own dues ledger (registered before /:id so 'me' isn't
// swallowed as a driver id).
router.get('/me/ledger', requireAuth('driver'), async (req, res) => {
    const entries = await listLedgerEntries(req.user.sub);
    const balance = await getDriverBalance(req.user.sub);
    res.json({ entries, balance });
});

router.get('/:id', requireAuth('admin'), async (req, res) => {
    const driver = await findDriverById(req.params.id);
    if (!driver || driver.deleted_at) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
});

router.get('/:id/ledger', requireAuth('admin'), async (req, res) => {
    const entries = await listLedgerEntries(req.params.id);
    const balance = await getDriverBalance(req.params.id);
    res.json({ entries, balance });
});

router.post('/:id/ledger', requireAuth('admin'), async (req, res) => {
    const { type, amount, entryDate, note } = req.body;
    if (!['charge', 'payment'].includes(type) || !amount) {
        return res.status(400).json({ error: 'type (charge or payment) and amount are required' });
    }
    const entry = await addLedgerEntry({ driverId: req.params.id, type, amount, entryDate, note });
    res.status(201).json(entry);
});

router.delete('/:id/ledger/:entryId', requireAuth('admin'), async (req, res) => {
    const entry = await findLedgerEntryById(req.params.entryId);
    if (!entry || entry.driver_id !== Number(req.params.id)) return res.status(404).json({ error: 'Ledger entry not found' });
    await deleteLedgerEntry(req.params.entryId);
    res.status(204).end();
});

router.post('/', requireAuth('admin'), async (req, res) => {
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const accessCode = `DRV-${crypto.randomInt(1000, 9999)}`;
    const driver = await createDriver({ name, phone, accessCode });
    res.status(201).json(driver);
});

router.patch('/:id', requireAuth('admin'), async (req, res) => {
    const { name, phone, isActive, monthlyDues } = req.body;
    const driver = await updateDriver(req.params.id, { name, phone, isActive, monthlyDues });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
});

// Soft-deletes the driver into the trash bin (restorable) rather than a
// hard delete, since their trip history stays referenced from invoices.
router.delete('/:id', requireAuth('admin'), async (req, res) => {
    const driver = await deleteDriver(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
});

export default router;
