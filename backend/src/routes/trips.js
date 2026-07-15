import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadReceipt } from '../middleware/upload.js';
import { uploadReceiptPhoto } from '../services/storage.js';
import { createTrip, searchTrips, findTripById, updateTrip, deleteTrip } from '../models/trip.js';
import { recalculateInvoiceTotal } from '../models/invoice.js';

const router = Router();

// Driver submits a trip with a receipt photo
router.post('/', requireAuth('driver'), uploadReceipt.single('receipt'), async (req, res) => {
    const { clientAccountId, departureLocation, arrivalLocation, amount } = req.body;
    if (!clientAccountId || !departureLocation || !arrivalLocation || !amount) {
        return res.status(400).json({ error: 'clientAccountId, departureLocation, arrivalLocation and amount are required' });
    }

    const receiptPhotoUrl = req.file ? await uploadReceiptPhoto(req.file) : null;

    const trip = await createTrip({
        driverId: req.user.sub,
        clientAccountId,
        departureLocation,
        arrivalLocation,
        amount,
        receiptPhotoUrl,
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

// Admin edits a trip. Editing one that's already on an invoice is allowed —
// the invoice's total is recalculated from its line items right after, so it
// never goes stale relative to what it actually lists.
router.patch('/:id', requireAuth('admin'), async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const { departureLocation, arrivalLocation, amount, tripDate } = req.body;
    const updated = await updateTrip(req.params.id, { departureLocation, arrivalLocation, amount, tripDate });
    if (trip.invoice_id) await recalculateInvoiceTotal(trip.invoice_id);
    res.json(updated);
});

// Admin deletes a trip. If it was on an invoice, that invoice's total is
// recalculated (and, if it was the last line, the invoice is left at $0
// rather than deleted outright — admin can delete the invoice separately).
router.delete('/:id', requireAuth('admin'), async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    await deleteTrip(req.params.id);
    if (trip.invoice_id) await recalculateInvoiceTotal(trip.invoice_id);
    res.status(204).end();
});

export default router;
