import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatDate, formatCurrency } from '../../lib/format.js';
import MonthNav, { currentMonthValue, monthParam, monthDateRange } from '../../components/MonthNav.jsx';

export default function MyAccount() {
    const { auth } = useAuth();
    const { t, lang } = useLanguage();
    const [month, setMonth] = useState(currentMonthValue);
    const [trips, setTrips] = useState([]);
    const [ledger, setLedger] = useState({ entries: [], balance: 0 });

    useEffect(() => {
        const { dateFrom, dateTo } = monthDateRange(month);
        api.listTrips(auth.token, { dateFrom, dateTo }).then(setTrips);
        api.getMyLedger(auth.token, monthParam(month)).then(setLedger);
    }, [month]);

    const tripsTotal = trips.reduce((sum, trip) => sum + Number(trip.amount), 0);

    return (
        <div>
            <div className="eyebrow">{t('driver.account.eyebrow')}</div>
            <h1 className="h1" style={{ fontSize: 26, marginBottom: 20 }}>{t('driver.account.title')}</h1>

            <MonthNav value={month} onChange={setMonth} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card">
                    <div className="eyebrow">{t('driver.account.tripsTotalEyebrow')}</div>
                    <div style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>{formatCurrency(tripsTotal, lang)}</div>
                    <p className="subtle" style={{ marginTop: 4 }}>{t('driver.account.tripsCount', { count: trips.length })}</p>
                </div>

                <div className="card" style={{ boxShadow: ledger.balance > 0 ? 'inset 0 0 0 1px rgba(240,85,76,0.4)' : undefined }}>
                    <div className="eyebrow">{t('driver.account.balanceEyebrow')}</div>
                    <div style={{ fontSize: 28, fontWeight: 600, marginTop: 6, color: ledger.balance > 0 ? 'var(--danger)' : undefined }}>
                        {formatCurrency(ledger.balance, lang)}
                    </div>
                    <p className="subtle" style={{ marginTop: 4 }}>{t('driver.account.balanceHint')}</p>
                </div>
            </div>

            <div className="eyebrow" style={{ marginTop: 24, marginBottom: 10 }}>{t('driver.account.historyEyebrow')}</div>
            {ledger.entries.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">{t('driver.account.emptyHistory')}</div>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('driver.account.colDate')}</th>
                                <th>{t('driver.account.colType')}</th>
                                <th>{t('driver.account.colAmount')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.entries.map((entry) => (
                                <tr key={entry.id}>
                                    <td>{formatDate(entry.entry_date, lang)}</td>
                                    <td>{entry.type === 'charge' ? t('driver.account.typeCharge') : t('driver.account.typePayment')}</td>
                                    <td style={{ color: entry.type === 'charge' ? 'var(--danger)' : '#0f8a5f' }}>
                                        {entry.type === 'charge' ? '+' : '-'}{formatCurrency(entry.amount, lang)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
