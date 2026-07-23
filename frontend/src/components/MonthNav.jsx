import { useLanguage } from '../i18n/LanguageContext.jsx';

export function currentMonthValue() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function monthParam({ year, month }) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

export function monthDateRange({ year, month }) {
    const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
    const dateTo = new Date(year, month, 0).toISOString().slice(0, 10);
    return { dateFrom, dateTo };
}

export default function MonthNav({ value, onChange }) {
    const { lang } = useLanguage();
    const { year, month } = value;
    const { year: curYear, month: curMonth } = currentMonthValue();
    const isCurrentMonth = year === curYear && month === curMonth;

    function shift(delta) {
        let newMonth = month + delta;
        let newYear = year;
        if (newMonth < 1) { newMonth = 12; newYear -= 1; }
        if (newMonth > 12) { newMonth = 1; newYear += 1; }
        onChange({ year: newYear, month: newMonth });
    }

    const label = new Date(year, month - 1, 1).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
        month: 'long',
        year: 'numeric',
    });

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button type="button" className="btn btn--ghost" onClick={() => shift(-1)} style={{ padding: '6px 12px' }}>←</button>
            <div style={{ fontWeight: 600, textTransform: 'capitalize', minWidth: 150, textAlign: 'center' }}>{label}</div>
            <button
                type="button"
                className="btn btn--ghost"
                onClick={() => shift(1)}
                disabled={isCurrentMonth}
                style={{ padding: '6px 12px' }}
            >
                →
            </button>
        </div>
    );
}
