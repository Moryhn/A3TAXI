const LOCALE_MAP = { en: 'en-CA', fr: 'fr-CA' };

export function formatDate(value, lang, opts = {}) {
    if (!value) return '';
    return new Date(value).toLocaleDateString(LOCALE_MAP[lang] || 'en-CA', opts);
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
