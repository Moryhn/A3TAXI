import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
    createReservation,
    markReservationSmsSent,
    listReservations,
    updateReservation,
    deleteReservation,
} from '../models/reservation.js';
import { sendReservationConfirmationSms } from '../services/sms.js';

const router = Router();

// Public booking form — no auth required
router.post('/', async (req, res) => {
    const { clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime } = req.body;
    if (!clientName || !clientPhone || !pickupLocation || !dropoffLocation || !requestedTime) {
        return res.status(400).json({ error: 'clientName, clientPhone, pickupLocation, dropoffLocation and requestedTime are required' });
    }

    const reservation = await createReservation({
        clientName,
        clientPhone,
        clientEmail,
        pickupLocation,
        dropoffLocation,
        requestedTime,
    });

    try {
        await sendReservationConfirmationSms(
            clientPhone,
            `Hi ${clientName}, your ride request for ${new Date(requestedTime).toLocaleString()} has been received. We'll confirm shortly.`
        );
        await markReservationSmsSent(reservation.id);
    } catch (err) {
        console.error('Failed to send reservation SMS:', err);
    }

    res.status(201).json(reservation);
});

// Admin calendar view
router.get('/', requireAuth('admin'), async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const reservations = await listReservations({ dateFrom, dateTo });
    res.json(reservations);
});

router.patch('/:id', requireAuth('admin'), async (req, res) => {
    const { status, clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime } = req.body;
    if (status && !['pending', 'confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'status must be pending, confirmed, or cancelled' });
    }
    const reservation = await updateReservation(req.params.id, {
        status, clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime,
    });
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(reservation);
});

router.delete('/:id', requireAuth('admin'), async (req, res) => {
    await deleteReservation(req.params.id);
    res.status(204).end();
});

export default router;
