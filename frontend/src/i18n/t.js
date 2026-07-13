export function translate(dict, key, params) {
    const raw = key.split('.').reduce((obj, part) => obj?.[part], dict);
    if (raw === undefined) {
        if (import.meta.env.DEV) console.warn(`[i18n] Missing key: "${key}"`);
        return key;
    }
    if (!params) return raw;
    return Object.keys(params).reduce(
        (str, p) => str.replaceAll(`{{${p}}}`, String(params[p])),
        raw
    );
}
