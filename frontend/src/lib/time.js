const STALE_THRESHOLD_MS = 90 * 1000;
const LOCALE_MAP = { en: 'en-CA', fr: 'fr-CA' };

export function isStale(recordedAt) {
    return Date.now() - new Date(recordedAt).getTime() > STALE_THRESHOLD_MS;
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
