// Read-only iCalendar (RFC 5545) feed for the admin's reservation calendar —
// Outlook/Google Calendar "subscribe from URL" polls this on their own
// schedule (typically every 15-60 min for Outlook). No write-back, no OAuth:
// the token in the feed URL is the only credential.
const DEFAULT_DURATION_MIN = 30;

function toIcsDate(date) {
    return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Human-readable (not the ICS date fields above) — for the DESCRIPTION text,
// in the same timezone the rest of the app displays times in.
function formatDisplayDateTime(date) {
    return new Date(date).toLocaleString('en-US', {
        timeZone: 'America/Toronto',
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

// Escapes text per RFC 5545 §3.3.11 — commas, semicolons, backslashes, and
// newlines all need escaping inside a text value.
function escapeText(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

function buildEvent(reservation) {
    const start = new Date(reservation.requested_time);
    const end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60 * 1000);
    const summary = reservation.dropoff_location
        ? `${reservation.client_name} — ${reservation.pickup_location} → ${reservation.dropoff_location}`
        : `${reservation.client_name} — ${reservation.service_type}`;
    const descriptionLines = [
        `Phone: ${reservation.client_phone}`,
        `Status: ${reservation.status}`,
        reservation.estimated_price != null ? `Estimated: $${Number(reservation.estimated_price).toFixed(2)}` : null,
        reservation.return_flight_number ? `Return flight: ${reservation.return_flight_number}` : null,
        reservation.return_arrival_time ? `Return arrival: ${formatDisplayDateTime(reservation.return_arrival_time)}` : null,
    ].filter(Boolean);

    return [
        'BEGIN:VEVENT',
        `UID:a3taxi-reservation-${reservation.id}@a3taxi`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(end)}`,
        `SUMMARY:${escapeText(summary)}`,
        `DESCRIPTION:${escapeText(descriptionLines.join('\n'))}`,
        `LOCATION:${escapeText(reservation.pickup_location)}`,
        `STATUS:${reservation.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT',
    ].join('\r\n');
}

function wrapCalendar(events, { calName, method } = {}) {
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//A3TAXI//Reservations//EN',
        'CALSCALE:GREGORIAN',
        method ? `METHOD:${method}` : null,
        calName ? `X-WR-CALNAME:${calName}` : null,
        ...events,
        'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
}

export function buildReservationsIcs(reservations) {
    return wrapCalendar(reservations.map(buildEvent), { calName: 'A3TAXI Reservations', method: 'PUBLISH' });
}

// Single-event file behind the per-reservation link texted to the admin.
// Deliberately no METHOD/X-WR-CALNAME here — those two properties are what
// several calendar apps (notably Google Calendar's .ics import on Android)
// read as "this file describes a whole calendar to subscribe to", which
// produced exactly the confusing "subscription calendar" prompt this link
// exists to avoid. A bare VEVENT with nothing declaring it as a feed is what
// gets offered as a plain one-tap "Add event" on iOS/Android/Outlook.
export function buildSingleReservationIcs(reservation) {
    return wrapCalendar([buildEvent(reservation)]);
}
