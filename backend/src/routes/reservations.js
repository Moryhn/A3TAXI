import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import {
    createReservation,
    markReservationSmsSent,
    listReservations,
    updateReservation,
    deleteReservation,
    findReservationByEventToken,
} from '../models/reservation.js';
import { findAdminById, findAdminByCalendarFeedToken, setCalendarFeedToken } from '../models/adminUser.js';
import { listActivePhones, listPhones, createPhone, updatePhone, deletePhone } from '../models/adminNotificationPhone.js';
import { sendSms } from '../services/sms.js';
import { getRideEstimate } from '../services/quote.js';
import { buildReservationsIcs, buildSingleReservationIcs } from '../services/ics.js';
import { sendReservationNotification } from '../services/push.js';

const router = Router();

const SERVICE_TYPES = ['ride', 'battery_boost', 'lockout'];

// Live price-estimate preview while the customer is filling out the booking form
router.post('/quote', async (req, res) => {
    const { pickupLocation, dropoffLocation, requestedTime, isRoundTrip, serviceType } = req.body;
    const quote = await getRideEstimate({
        pickupLocation, dropoffLocation, requestedTime, isRoundTrip: !!isRoundTrip, serviceType: serviceType || 'ride',
    });
    res.json(quote);
});

// Public booking form — no auth required
router.post('/', async (req, res) => {
    const {
        clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime,
        serviceType = 'ride', passengerCount, carryOnCount, checkedLuggageCount, isRoundTrip,
        destinationCategory, vehicleType, returnFlightNumber, returnArrivalTime,
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
    const quote = await getRideEstimate({ pickupLocation, dropoffLocation, requestedTime, isRoundTrip: !!isRoundTrip, serviceType });

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
        destinationCategory: destinationCategory || 'local',
        vehicleType: vehicleType || null,
        returnFlightNumber: returnFlightNumber || null,
        returnArrivalTime: returnArrivalTime || null,
    });

    try {
        // Explicit timeZone — the server (Render) runs in UTC, so a plain
        // toLocaleString() would show the customer a time that doesn't match
        // what they picked or what the admin calendar displays.
        const formattedTime = new Date(requestedTime).toLocaleString('en-US', {
            timeZone: 'America/Toronto',
            dateStyle: 'medium',
            timeStyle: 'short',
        });
        await sendSms(
            clientPhone,
            `Hi ${clientName}, your ride request for ${formattedTime} has been received. We'll confirm shortly.`
        );
        await markReservationSmsSent(reservation.id);
    } catch (err) {
        console.error('Failed to send reservation SMS:', err);
    }

    // Admin-facing "someone just booked" alert — separate from the
    // customer's own confirmation SMS above. Never blocks the customer's
    // response: a failure here just gets logged.
    notifyAdminsOfNewReservation(reservation).catch((err) => console.error('Admin reservation notification failed:', err.message));

    res.status(201).json(reservation);
});

async function notifyAdminsOfNewReservation(reservation) {
    const eventUrl = `${(process.env.PUBLIC_API_URL || '').replace(/\/$/, '')}/api/reservations/event/${reservation.event_token}.ics`;
    const formattedTime = new Date(reservation.requested_time).toLocaleString('en-US', {
        timeZone: 'America/Toronto',
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    const route = reservation.dropoff_location
        ? `${reservation.pickup_location} → ${reservation.dropoff_location}`
        : reservation.pickup_location;
    const message = `Nouvelle réservation A3TAXI : ${reservation.client_name} — ${route} — ${formattedTime}. Ajouter à mon calendrier : ${eventUrl}`;

    const phones = await listActivePhones();
    await Promise.all(phones.map((p) => sendSms(p.phone, message).catch((err) => console.error(`Admin SMS to ${p.phone} failed:`, err.message))));

    await sendReservationNotification(reservation);
}

// Admin calendar view
router.get('/', requireAuth('admin'), async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const reservations = await listReservations({ dateFrom, dateTo });
    res.json(reservations);
});

router.patch('/:id', requireAuth('admin'), async (req, res) => {
    const {
        status, clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime,
        serviceType, passengerCount, carryOnCount, checkedLuggageCount, isRoundTrip, destinationCategory,
        vehicleType, returnFlightNumber, returnArrivalTime,
    } = req.body;
    if (status && !['pending', 'confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'status must be pending, confirmed, or cancelled' });
    }
    if (serviceType && !SERVICE_TYPES.includes(serviceType)) {
        return res.status(400).json({ error: `serviceType must be one of ${SERVICE_TYPES.join(', ')}` });
    }
    const reservation = await updateReservation(req.params.id, {
        status, clientName, clientPhone, clientEmail, pickupLocation, dropoffLocation, requestedTime,
        serviceType, passengerCount, carryOnCount, checkedLuggageCount, isRoundTrip, destinationCategory,
        vehicleType, returnFlightNumber, returnArrivalTime,
    });
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(reservation);
});

router.delete('/:id', requireAuth('admin'), async (req, res) => {
    await deleteReservation(req.params.id);
    res.status(204).end();
});

// Returns the admin's Outlook/Google "subscribe from URL" feed link,
// generating a token on first use.
router.get('/calendar-feed', requireAuth('admin'), async (req, res) => {
    let admin = await findAdminById(req.user.sub);
    if (!admin.calendar_feed_token) {
        const token = crypto.randomBytes(24).toString('base64url');
        admin = await setCalendarFeedToken(admin.id, token);
    }
    const feedUrl = `${(process.env.PUBLIC_API_URL || '').replace(/\/$/, '')}/api/reservations/calendar/${admin.calendar_feed_token}.ics`;
    res.json({ feedUrl });
});

// Invalidates the previous feed URL (e.g. if it was shared/leaked) and
// issues a new one.
router.post('/calendar-feed/regenerate', requireAuth('admin'), async (req, res) => {
    const token = crypto.randomBytes(24).toString('base64url');
    const admin = await setCalendarFeedToken(req.user.sub, token);
    const feedUrl = `${(process.env.PUBLIC_API_URL || '').replace(/\/$/, '')}/api/reservations/calendar/${admin.calendar_feed_token}.ics`;
    res.json({ feedUrl });
});

// Public — no login. Outlook/Google Calendar fetch this URL directly on
// their own refresh schedule; the token in the path is the only gate.
router.get('/calendar/:token.ics', async (req, res) => {
    const admin = await findAdminByCalendarFeedToken(req.params.token);
    if (!admin) return res.status(404).send('Not found');

    const reservations = (await listReservations()).filter((r) => r.status !== 'cancelled');
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.send(buildReservationsIcs(reservations));
});

// Public — no login. The link texted to the admin's notification numbers;
// tapping it on a phone offers "Add to Calendar" directly (no
// Content-Disposition: attachment — that would force a download prompt
// instead of the native calendar handoff on iOS/Android).
router.get('/event/:token.ics', async (req, res) => {
    const reservation = await findReservationByEventToken(req.params.token);
    if (!reservation) return res.status(404).send('Not found');

    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.send(buildSingleReservationIcs(reservation));
});

// Admin-managed list of phone numbers texted for every new public booking.
router.get('/notification-phones', requireAuth('admin'), async (req, res) => {
    res.json(await listPhones());
});

router.post('/notification-phones', requireAuth('admin'), async (req, res) => {
    const { phone, label } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    res.status(201).json(await createPhone({ phone, label }));
});

router.patch('/notification-phones/:id', requireAuth('admin'), async (req, res) => {
    const { phone, label, isActive } = req.body;
    const updated = await updatePhone(req.params.id, { phone, label, isActive });
    if (!updated) return res.status(404).json({ error: 'Phone not found' });
    res.json(updated);
});

router.delete('/notification-phones/:id', requireAuth('admin'), async (req, res) => {
    const deleted = await deletePhone(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Phone not found' });
    res.status(204).end();
});

export default router;
