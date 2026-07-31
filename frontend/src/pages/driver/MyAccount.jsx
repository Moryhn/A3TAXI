import { useEffect, useState } from 'react';
import { api, receiptUrl } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatCalendarDate, formatDate, formatCurrency } from '../../lib/format.js';
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

            <div className="eyebrow" style={{ marginTop: 24, marginBottom: 10 }}>{t('driver.account.tripsEyebrow')}</div>
            {trips.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">{t('driver.account.tripsEmptyTitle')}</div>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('driver.account.tripsColDate')}</th>
                                <th>{t('driver.account.tripsColClient')}</th>
                                <th>{t('driver.account.tripsColRoute')}</th>
                                <th>{t('driver.account.tripsColDirection')}</th>
                                <th>{t('driver.account.tripsColAmount')}</th>
                                <th>{t('driver.account.tripsColReceipt')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trips.map((trip) => (
                                <tr key={trip.id}>
                                    <td className="subtle">{formatDate(trip.trip_date, lang)}</td>
                                    <td>{trip.client_name}</td>
                                    <td>{trip.departure_location} → {trip.arrival_location}</td>
                                    <td className="subtle">{t(`driver.account.direction${trip.direction === 'aller_retour' ? 'AllerRetour' : trip.direction === 'retour' ? 'Retour' : 'Aller'}`)}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(trip.amount, lang)}</td>
                                    <td>{trip.receipt_photo_url ? <a href={receiptUrl(trip.receipt_photo_url)} target="_blank" rel="noreferrer" style={{ color: 'var(--amber)' }}>{t('driver.account.viewReceipt')}</a> : <span className="subtle">—</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

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
                                    <td>{formatCalendarDate(entry.entry_date, lang)}</td>
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
