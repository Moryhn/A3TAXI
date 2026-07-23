import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatDate, formatCurrency } from '../../lib/format.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import MonthNav, { currentMonthValue, monthParam, monthDateRange } from '../../components/MonthNav.jsx';

export default function DriverDetail() {
    const { id } = useParams();
    const { auth } = useAuth();
    const { t, lang } = useLanguage();
    const [month, setMonth] = useState(currentMonthValue);
    const [driver, setDriver] = useState(null);
    const [trips, setTrips] = useState([]);
    const [ledger, setLedger] = useState({ entries: [], balance: 0 });
    const [dues, setDues] = useState('');
    const [savingDues, setSavingDues] = useState(false);
    const [entryForm, setEntryForm] = useState({ type: 'charge', amount: '', entryDate: '', note: '' });
    const [addingEntry, setAddingEntry] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [error, setError] = useState('');

    async function refresh() {
        const { dateFrom, dateTo } = monthDateRange(month);
        const [d, t, l] = await Promise.all([
            api.getDriver(auth.token, id),
            api.listTrips(auth.token, { driverId: id, dateFrom, dateTo }),
            api.getDriverLedger(auth.token, id, monthParam(month)),
        ]);
        setDriver(d);
        setDues(d.monthly_dues);
        setTrips(t);
        setLedger(l);
    }

    useEffect(() => { refresh(); }, [id, month]);

    const tripsTotal = trips.reduce((sum, trip) => sum + Number(trip.amount), 0);

    async function saveDues() {
        setSavingDues(true);
        setError('');
        try {
            await api.updateDriver(auth.token, id, { monthlyDues: dues });
            refresh();
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingDues(false);
        }
    }

    async function handleAddEntry(e) {
        e.preventDefault();
        setAddingEntry(true);
        setError('');
        try {
            await api.addDriverLedgerEntry(auth.token, id, entryForm);
            setEntryForm({ type: 'charge', amount: '', entryDate: '', note: '' });
            refresh();
        } catch (err) {
            setError(err.message);
        } finally {
            setAddingEntry(false);
        }
    }

    async function confirmDelete() {
        await api.deleteDriverLedgerEntry(auth.token, id, pendingDelete.id);
        setPendingDelete(null);
        refresh();
    }

    if (!driver) return null;

    return (
        <div>
            <div className="page__head">
                <div>
                    <Link to="/admin/drivers" className="subtle" style={{ display: 'inline-block', marginBottom: 8 }}>{t('admin.driverDetail.back')}</Link>
                    <div className="eyebrow">{t('admin.driverDetail.eyebrow')}</div>
                    <h1 className="h1">{driver.name}</h1>
                </div>
                <div className="meter meter--sm" style={{ color: ledger.balance > 0 ? 'var(--danger)' : undefined }}>
                    {formatCurrency(ledger.balance, lang)}<span className="meter__unit">{t('admin.driverDetail.balanceOwed')}</span>
                </div>
            </div>

            {error && <div className="pill" style={{ marginBottom: 16, color: 'var(--danger)', background: 'rgba(240,85,76,0.12)' }}>{error}</div>}

            <MonthNav value={month} onChange={setMonth} />

            <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="card" style={{ flex: 1 }}>
                    <div className="eyebrow">{t('admin.driverDetail.tripsTotalEyebrow')}</div>
                    <div style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>{formatCurrency(tripsTotal, lang)}</div>
                    <p className="subtle" style={{ marginTop: 4 }}>{t('admin.driverDetail.tripsCount', { count: trips.length })}</p>
                </div>
                <div className="card" style={{ flex: 1 }}>
                    <div className="eyebrow">{t('admin.driverDetail.monthlyDuesEyebrow')}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
                        <input className="input" type="number" step="0.01" value={dues} onChange={(e) => setDues(e.target.value)} style={{ maxWidth: 140 }} />
                        <button onClick={saveDues} className="btn btn--primary" disabled={savingDues}>{t('common.save')}</button>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="eyebrow">{t('admin.driverDetail.addEntryEyebrow')}</div>
                <form onSubmit={handleAddEntry} className="form-row" style={{ marginTop: 10 }}>
                    <div className="field">
                        <label>{t('admin.driverDetail.typeLabel')}</label>
                        <select className="select" value={entryForm.type} onChange={(e) => setEntryForm({ ...entryForm, type: e.target.value })}>
                            <option value="charge">{t('admin.driverDetail.typeCharge')}</option>
                            <option value="payment">{t('admin.driverDetail.typePayment')}</option>
                        </select>
                    </div>
                    <div className="field">
                        <label>{t('admin.driverDetail.amountLabel')}</label>
                        <input className="input" type="number" step="0.01" value={entryForm.amount} onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label>{t('admin.driverDetail.dateLabel')}</label>
                        <input className="input" type="date" value={entryForm.entryDate} onChange={(e) => setEntryForm({ ...entryForm, entryDate: e.target.value })} />
                    </div>
                    <div className="field" style={{ flex: 2 }}>
                        <label>{t('admin.driverDetail.noteLabel')}</label>
                        <input className="input" value={entryForm.note} onChange={(e) => setEntryForm({ ...entryForm, note: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn--primary" disabled={addingEntry}>{t('admin.driverDetail.addEntryBtn')}</button>
                </form>
            </div>

            {ledger.entries.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">{t('admin.driverDetail.emptyLedgerTitle')}</div>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('admin.driverDetail.colDate')}</th>
                                <th>{t('admin.driverDetail.colType')}</th>
                                <th>{t('admin.driverDetail.colAmount')}</th>
                                <th>{t('admin.driverDetail.colNote')}</th>
                                <th>{t('admin.driverDetail.colActions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.entries.map((entry) => (
                                <tr key={entry.id}>
                                    <td>{formatDate(entry.entry_date, lang)}</td>
                                    <td>{entry.type === 'charge' ? t('admin.driverDetail.typeCharge') : t('admin.driverDetail.typePayment')}</td>
                                    <td style={{ color: entry.type === 'charge' ? 'var(--danger)' : '#0f8a5f' }}>
                                        {entry.type === 'charge' ? '+' : '-'}{formatCurrency(entry.amount, lang)}
                                    </td>
                                    <td className="subtle">{entry.note || '—'}</td>
                                    <td>
                                        <button onClick={() => setPendingDelete(entry)} className="btn btn--danger" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.delete')}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                open={!!pendingDelete}
                title={t('admin.driverDetail.confirmDeleteTitle')}
                message={t('admin.driverDetail.confirmDeleteMessage')}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
