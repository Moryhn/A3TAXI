const LOCALE_MAP = { en: 'en-CA', fr: 'fr-CA' };

export function formatDate(value, lang, opts = {}) {
    if (!value) return '';
    return new Date(value).toLocaleDateString(LOCALE_MAP[lang] || 'en-CA', opts);
}

// For a Postgres DATE column (period_start/period_end, invoice_date,
// entry_date — no time-of-day, just a calendar day), the API returns it as
// "2026-07-20T00:00:00.000Z". Formatting that with formatDate() converts to
// the viewer's local time first, which in Eastern time shows the day before.
// Reading it back out in UTC instead keeps the exact day that was picked/
// stored, regardless of the viewer's timezone.
export function formatCalendarDate(value, lang, opts = {}) {
    if (!value) return '';
    return new Date(value).toLocaleDateString(LOCALE_MAP[lang] || 'en-CA', { ...opts, timeZone: 'UTC' });
}

export function formatDateTime(value, lang, opts = {}) {
    if (!value) return '';
    return new Date(value).toLocaleString(LOCALE_MAP[lang] || 'en-CA', opts);
}

export function formatCurrency(amount, lang) {
    return new Intl.NumberFormat(LOCALE_MAP[lang] || 'en-CA', {
        style: 'currency',
        currency: 'CAD',
    }).format(Number(amount) || 0);
}

// Mirrors backend/src/services/tax.js — trip amounts are entered tax-included,
// so the printed invoice back-calculates the pre-tax subtotal and itemizes
// GST (TPS 5%) + QST (TVQ 9.975%), both computed on that same pre-tax base.
export function calculateTaxBreakdown(totalAmount) {
    const GST_RATE = 0.05;
    const QST_RATE = 0.09975;
    const total = Number(totalAmount) || 0;
    const preTax = total / (1 + GST_RATE + QST_RATE);
    return { preTax, gst: preTax * GST_RATE, qst: preTax * QST_RATE, total };
}
