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

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
    // The HTML landing page (button-triggered Blob download), not the raw
    // .ics link — see the long comment on GET /event/:token for why.
    const eventUrl = `${(process.env.PUBLIC_API_URL || '').replace(/\/$/, '')}/api/reservations/event/${reservation.event_token}`;
    const formattedTime = new Date(reservation.requested_time).toLocaleString('en-US', {
        timeZone: 'America/Toronto',
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    const route = reservation.dropoff_location
        ? `${reservation.pickup_location} → ${reservation.dropoff_location}`
        : reservation.pickup_location;
    const message = `Nouvelle réservation A3TAXI : ${reservation.client_name} — ${route} — ${formattedTime}. Touchez ce lien, puis « Ajouter à mon calendrier » : ${eventUrl}`;

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

// Public — no login. Raw .ics file. NOT the link texted to the admin
// anymore — confirmed on a real iPhone that a network text/calendar URL
// gets treated as "subscribe to a live feed" regardless of headers
// (METHOD/X-WR-CALNAME removed, then Content-Disposition: attachment added
// — neither changed the behavior). Kept around for anything that wants the
// raw file directly; see the HTML landing page below for what's actually
// linked from the SMS.
router.get('/event/:token.ics', async (req, res) => {
    const reservation = await findReservationByEventToken(req.params.token);
    if (!reservation) return res.status(404).send('Not found');

    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="reservation-${reservation.id}.ics"`);
    res.send(buildSingleReservationIcs(reservation));
});

// Public — no login. This is the link actually texted to the admin. A tap
// on the button below turns the ICS text (embedded in the page, no extra
// fetch) into a same-origin Blob and clicks a hidden download link — that
// local-file download is what reliably hands off to Calendar's one-time
// "Add Event" import on iOS/Android, since there's no network origin left
// for the OS to treat as a subscribable feed.
router.get('/event/:token', async (req, res) => {
    const reservation = await findReservationByEventToken(req.params.token);
    if (!reservation) return res.status(404).send('<!doctype html><meta charset="utf-8"><p>Réservation introuvable.</p>');

    const icsContent = buildSingleReservationIcs(reservation);
    const formattedTime = new Date(reservation.requested_time).toLocaleString('fr-CA', {
        timeZone: 'America/Toronto',
        dateStyle: 'full',
        timeStyle: 'short',
    });
    const route = reservation.dropoff_location
        ? `${reservation.pickup_location} → ${reservation.dropoff_location}`
        : reservation.pickup_location;
    // Safe to embed: JSON.stringify escapes quotes/backslashes/newlines into
    // a valid JS string literal; the extra "</" guard stops a (implausible
    // but public-form-submitted) address containing "</script>" from
    // closing the tag early.
    const icsJs = JSON.stringify(icsContent).replace(/<\//g, '<\\/');

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A3TAXI — Ajouter au calendrier</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background:#0c0f12; color:#f4f4f4; margin:0; padding:40px 20px; }
  .card { max-width:420px; margin:0 auto; background:#171b20; border-radius:16px; padding:24px; text-align:center; }
  h1 { font-size:19px; margin:0 0 14px; }
  p { color:#b7c0c9; line-height:1.6; margin:6px 0; font-size:15px; }
  button { margin-top:22px; width:100%; padding:16px; font-size:17px; font-weight:600; border:none; border-radius:12px; background:#f5b700; color:#1b1b0d; }
  button:active { opacity:0.85; }
  .hint { margin-top:14px; font-size:13px; color:#7c8792; }
</style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(reservation.client_name)}</h1>
    <p>${escapeHtml(route)}</p>
    <p>${escapeHtml(formattedTime)}</p>
    <button onclick="addToCalendar()">📅 Ajouter à mon calendrier</button>
    <p class="hint">Votre téléphone va proposer d'ajouter cet événement à Calendrier.</p>
  </div>
  <script>
    var icsContent = ${icsJs};
    function addToCalendar() {
      var blob = new Blob([icsContent], { type: 'text/calendar' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'reservation-${reservation.id}.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
    }
  </script>
</body>
</html>`);
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
