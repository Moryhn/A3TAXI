import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadReceipt, multerErrors } from '../middleware/upload.js';
import { uploadReceiptPhoto } from '../services/storage.js';
import { createTrip, searchTrips, findTripById, updateTrip, deleteTrip } from '../models/trip.js';
import { recalculateInvoiceTotal, findInvoiceById } from '../models/invoice.js';

async function rejectIfInvoiceFinalized(res, invoiceId) {
    if (!invoiceId) return false;
    const invoice = await findInvoiceById(invoiceId);
    if (invoice?.finalized_at) {
        res.status(409).json({ error: 'This invoice has been finalized and can no longer be changed' });
        return true;
    }
    return false;
}

const router = Router();

// Driver submits a trip with a receipt photo
router.post('/', requireAuth('driver'), multerErrors(uploadReceipt.single('receipt')), async (req, res) => {
    const { clientAccountId, departureLocation, arrivalLocation, amount, direction } = req.body;
    if (!clientAccountId || !departureLocation || !arrivalLocation || !amount) {
        return res.status(400).json({ error: 'clientAccountId, departureLocation, arrivalLocation and amount are required' });
    }
    if (direction && !['aller', 'retour', 'aller_retour'].includes(direction)) {
        return res.status(400).json({ error: 'direction must be aller, retour, or aller_retour' });
    }

    const receiptPhotoUrl = req.file ? await uploadReceiptPhoto(req.file) : null;

    const trip = await createTrip({
        driverId: req.user.sub,
        clientAccountId,
        departureLocation,
        arrivalLocation,
        amount,
        receiptPhotoUrl,
        direction,
    });

    res.status(201).json(trip);
});

// Admin searches/filters trips by date, driver, or client account.
// Drivers can list their own trips (driverId forced to self).
router.get('/', requireAuth('admin', 'driver'), async (req, res) => {
    const { clientAccountId, dateFrom, dateTo, invoiced } = req.query;
    let { driverId } = req.query;

    if (req.user.role === 'driver') {
        driverId = req.user.sub;
    }

    const trips = await searchTrips({
        driverId,
        clientAccountId,
        dateFrom,
        dateTo,
        invoiced: invoiced === undefined ? undefined : invoiced === 'true',
    });

    res.json(trips);
});

// Admin edits any trip; a driver may edit only their own — same rule a
// finalized invoice already enforces against admin. Accepts an optional new
// receipt photo (replacing a blurry/wrong one) alongside the usual fields;
// editing one that's already on an (unfinalized) invoice recalculates that
// invoice's total right after, so it never goes stale relative to what it
// actually lists.
router.patch('/:id', requireAuth('admin', 'driver'), multerErrors(uploadReceipt.single('receipt')), async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (req.user.role === 'driver') {
        if (trip.driver_id !== req.user.sub) {
            return res.status(403).json({ error: 'You can only edit your own trips' });
        }
        if (trip.invoice_id) {
            return res.status(409).json({ error: 'This trip has already been invoiced — ask admin to correct it' });
        }
    }
    if (await rejectIfInvoiceFinalized(res, trip.invoice_id)) return;

    const { departureLocation, arrivalLocation, amount, tripDate, direction } = req.body;
    const receiptPhotoUrl = req.file ? await uploadReceiptPhoto(req.file) : null;
    const updated = await updateTrip(req.params.id, { departureLocation, arrivalLocation, amount, tripDate, direction, receiptPhotoUrl });
    if (trip.invoice_id) await recalculateInvoiceTotal(trip.invoice_id);
    res.json(updated);
});

// Admin deletes any trip; a driver may delete only their own, and only
// before it's been invoiced (once billed, it's the admin's record to
// correct). If it was on an invoice, that invoice's total is recalculated
// (and, if it was the last line, the invoice is left at $0 rather than
// deleted outright — admin can delete the invoice separately).
router.delete('/:id', requireAuth('admin', 'driver'), async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (req.user.role === 'driver') {
        if (trip.driver_id !== req.user.sub) {
            return res.status(403).json({ error: 'You can only delete your own trips' });
        }
        if (trip.invoice_id) {
            return res.status(409).json({ error: 'This trip has already been invoiced — ask admin to delete it' });
        }
    }
    if (await rejectIfInvoiceFinalized(res, trip.invoice_id)) return;

    await deleteTrip(req.params.id);
    if (trip.invoice_id) await recalculateInvoiceTotal(trip.invoice_id);
    res.status(204).end();
});

export default router;
