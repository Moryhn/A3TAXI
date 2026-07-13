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
import { getDrivingDistance } from '../services/distance.js';
import { calculateFare } from '../services/pricing.js';

const router = Router();

const SERVICE_TYPES = ['ride', 'battery_boost', 'lockout'];

async function buildQuote({ pickupLocation, dropoffLocation, requestedTime, isRoundTrip, serviceType }) {
    if (serviceType !== 'ride' || !pickupLocation || !dropoffLocation) {
        return { distanceKm: null, durationMin: null, isNightRate: null, estimatedPrice: null };
    }
    const distance = await getDrivingDistance(pickupLocation, dropoffLocation);
    if (!distance) {
        return { distanceKm: null, durationMin: null, isNightRate: null, estimatedPrice: null };
    }
    const fare = calculateFare({ distanceKm: distance.distanceKm, requestedTime, isRoundTrip });
    return { ...distance, ...fare };
}

// Live price-estimate preview while the customer is filling out the booking form
router.post('/quote', async (req, res) => {
    const { pickupLocation, dropoffLocation, requestedTime, isRoundTrip, serviceType } = req.body;
    const quote = await buildQuote({
        pickupLocation, dropoffLocation, requestedTime, isRoundTrip: !!isRoundTrip, serviceType: serviceType || 'ride',
    });
    res.json(quote);
});

// Public booking form — no auth required
router.post('/', async (req, res) => {
    const {
        clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime,
        serviceType = 'ride', passengerCount, carryOnCount, checkedLuggageCount, isRoundTrip,
    } = req.body;

    if (!SERVICE_TYPES.includes(serviceType)) {
        return res.status(400).json({ error: `serviceType must be one of ${SERVICE_TYPES.join(', ')}` });
    }
    if (!clientName || !clientPhone || !pickupLocation || !requestedTime) {
        return res.status(400).json({ error: 'clientName, clientPhone, pickupLocation and requestedTime are required' });
    }
    if (serviceType === 'ride' && !dropoffLocation) {
        return res.status(400).json({ error: 'dropoffLocation is required for a ride' });
    }

    // Recomputed server-side regardless of anything the client may have sent for price —
    // never trust a client-supplied fare.
    const quote = await buildQuote({ pickupLocation, dropoffLocation, requestedTime, isRoundTrip: !!isRoundTrip, serviceType });

    const reservation = await createReservation({
        clientName,
        clientPhone,
        clientEmail,
        pickupLocation,
        dropoffLocation: serviceType === 'ride' ? dropoffLocation : null,
        requestedTime,
        serviceType,
        passengerCount: passengerCount || 1,
        carryOnCount: carryOnCount || 0,
        checkedLuggageCount: checkedLuggageCount || 0,
        isRoundTrip: !!isRoundTrip,
        distanceKm: quote.distanceKm,
        isNightRate: quote.isNightRate,
        estimatedPrice: quote.estimatedPrice,
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
    const {
        status, clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime,
        serviceType, passengerCount, carryOnCount, checkedLuggageCount, isRoundTrip,
    } = req.body;
    if (status && !['pending', 'confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'status must be pending, confirmed, or cancelled' });
    }
    if (serviceType && !SERVICE_TYPES.includes(serviceType)) {
        return res.status(400).json({ error: `serviceType must be one of ${SERVICE_TYPES.join(', ')}` });
    }
    const reservation = await updateReservation(req.params.id, {
        status, clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime,
        serviceType, passengerCount, carryOnCount, checkedLuggageCount, isRoundTrip,
    });
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(reservation);
});

router.delete('/:id', requireAuth('admin'), async (req, res) => {
    await deleteReservation(req.params.id);
    res.status(204).end();
});

export default router;
