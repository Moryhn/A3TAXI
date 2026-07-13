import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadReceipt } from '../middleware/upload.js';
import { createTrip, searchTrips, findTripById, updateTrip, deleteTrip } from '../models/trip.js';

const router = Router();

// Driver submits a trip with a receipt photo
router.post('/', requireAuth('driver'), uploadReceipt.single('receipt'), async (req, res) => {
    const { clientAccountId, departureLocation, arrivalLocation, amount } = req.body;
    if (!clientAccountId || !departureLocation || !arrivalLocation || !amount) {
        return res.status(400).json({ error: 'clientAccountId, departureLocation, arrivalLocation and amount are required' });
    }

    const receiptPhotoUrl = req.file ? `/uploads/${req.file.filename}` : null;

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

// Admin edits a trip (blocked once it's been invoiced, to protect billing history)
router.patch('/:id', requireAuth('admin'), async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.invoice_id) return res.status(409).json({ error: 'This trip has already been invoiced and can no longer be edited' });

    const { departureLocation, arrivalLocation, amount } = req.body;
    const updated = await updateTrip(req.params.id, { departureLocation, arrivalLocation, amount });
    res.json(updated);
});

// Admin deletes a trip (blocked once it's been invoiced)
router.delete('/:id', requireAuth('admin'), async (req, res) => {
    const trip = await findTripById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.invoice_id) return res.status(409).json({ error: 'This trip has already been invoiced and can no longer be deleted' });

    await deleteTrip(req.params.id);
    res.status(204).end();
});

export default router;
