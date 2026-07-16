// Read-only iCalendar (RFC 5545) feed for the admin's reservation calendar —
// Outlook/Google Calendar "subscribe from URL" polls this on their own
// schedule (typically every 15-60 min for Outlook). No write-back, no OAuth:
// the token in the feed URL is the only credential.
const DEFAULT_DURATION_MIN = 30;

function toIcsDate(date) {
    return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
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

export function buildReservationsIcs(reservations) {
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//A3TAXI//Reservations//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:A3TAXI Reservations',
        ...reservations.map(buildEvent),
        'END:VCALENDAR',
    ].join('\r\n');
}
