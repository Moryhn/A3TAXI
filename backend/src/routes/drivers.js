import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { listDrivers, createDriver, updateDriver, deleteDriver, findDriverById } from '../models/driver.js';
import { listLedgerEntries, getDriverBalance, addLedgerEntry, findLedgerEntryById, deleteLedgerEntry } from '../models/driverLedger.js';

const router = Router();

function generateAccessCode() {
    return `DRV-${crypto.randomInt(1000, 9999)}`;
}

// Resolves a "YYYY-MM" query param (defaulting to the current month) into the
// date range to list entries within, and the point in time the balance
// should be computed as of — end of that month, except for the current
// month, where it's today (so the current month always shows the live
// running balance, not a preview of what it'll be once the month ends).
function resolveMonthRange(monthParam) {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
        [year, month] = monthParam.split('-').map(Number);
    }

    const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
    const endOfMonth = new Date(year, month, 0).toISOString().slice(0, 10);
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    const asOf = isCurrentMonth ? now.toISOString().slice(0, 10) : endOfMonth;

    return { dateFrom, dateTo: endOfMonth, asOf };
}

router.get('/', requireAuth('admin'), async (req, res) => {
    const drivers = await listDrivers();
    res.json(drivers);
});

// Driver views their own dues ledger (registered before /:id so 'me' isn't
// swallowed as a driver id).
router.get('/me/ledger', requireAuth('driver'), async (req, res) => {
    const { dateFrom, dateTo, asOf } = resolveMonthRange(req.query.month);
    const entries = await listLedgerEntries(req.user.sub, { dateFrom, dateTo });
    const balance = await getDriverBalance(req.user.sub, asOf);
    res.json({ entries, balance });
});

router.get('/:id', requireAuth('admin'), async (req, res) => {
    const driver = await findDriverById(req.params.id);
    if (!driver || driver.deleted_at) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
});

router.get('/:id/ledger', requireAuth('admin'), async (req, res) => {
    const { dateFrom, dateTo, asOf } = resolveMonthRange(req.query.month);
    const entries = await listLedgerEntries(req.params.id, { dateFrom, dateTo });
    const balance = await getDriverBalance(req.params.id, asOf);
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

    const accessCode = generateAccessCode();
    const driver = await createDriver({ name, phone, accessCode });
    res.status(201).json(driver);
});

router.patch('/:id', requireAuth('admin'), async (req, res) => {
    const { name, phone, isActive, monthlyDues } = req.body;
    let { accessCode } = req.body;
    if (accessCode !== undefined) {
        accessCode = accessCode.trim().toUpperCase();
        if (!accessCode) return res.status(400).json({ error: 'Access code cannot be empty' });
    }

    let driver;
    try {
        driver = await updateDriver(req.params.id, { name, phone, isActive, monthlyDues, accessCode });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'This access code is already in use by another driver' });
        throw err;
    }
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
});

// Generates a fresh random access code for the driver, e.g. after they suspect
// it leaked — same format as at creation time.
router.post('/:id/reset-access-code', requireAuth('admin'), async (req, res) => {
    const driver = await updateDriver(req.params.id, { accessCode: generateAccessCode() });
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
