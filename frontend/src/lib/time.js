const STALE_THRESHOLD_MS = 90 * 1000;
const LOCALE_MAP = { en: 'en-CA', fr: 'fr-CA' };

export function isStale(recordedAt) {
    return Date.now() - new Date(recordedAt).getTime() > STALE_THRESHOLD_MS;
}

// <input type="datetime-local"> gives a timezone-less string ("2026-07-16T14:00").
// new Date() parses that as local time in whatever timezone is running the code,
// which is the browser here (correct — matches what the person typing it meant),
// but sending the raw string to the backend lets it get re-interpreted in the
// server's own timezone (UTC on Render) instead, shifting the stored time by the
// offset between Eastern and UTC. Converting to a real UTC ISO string up front
// pins down one unambiguous instant for every downstream reader.
export function localInputToUtcIso(value) {
    return value ? new Date(value).toISOString() : value;
}

// <input type="date"> gives a bare "2026-07-20" string. new Date() parses a
// date-only ISO string as UTC midnight (unlike datetime-local strings, which
// parse as local time) — sent straight to the backend, that UTC midnight
// reads back as the previous day once displayed in Eastern time. Anchoring
// at local noon before converting keeps the same calendar day regardless of
// which side of midnight the UTC/Eastern offset falls on.
export function localDateInputToUtcIso(value) {
    return value ? new Date(`${value}T12:00`).toISOString() : value;
}

export function formatRelativeTime(recordedAt, lang = 'en') {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(recordedAt).getTime()) / 1000));
    const rtf = new Intl.RelativeTimeFormat(LOCALE_MAP[lang] || 'en-CA', { numeric: 'auto' });
    if (seconds < 60) return rtf.format(-seconds, 'second');
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return rtf.format(-minutes, 'minute');
    const hours = Math.round(minutes / 60);
    return rtf.format(-hours, 'hour');
}
