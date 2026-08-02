import { useEffect, useState } from 'react';
import { api, receiptUrl } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatCalendarDate, formatDate, formatCurrency } from '../../lib/format.js';
import { localDateInputToUtcIso } from '../../lib/time.js';
import MonthNav, { currentMonthValue, monthParam, monthDateRange } from '../../components/MonthNav.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ReceiptPhotoField from '../../components/ReceiptPhotoField.jsx';

export default function MyAccount() {
    const { auth } = useAuth();
    const { t, lang } = useLanguage();
    const [month, setMonth] = useState(currentMonthValue);
    const [trips, setTrips] = useState([]);
    const [ledger, setLedger] = useState({ entries: [], balance: 0 });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ tripDate: '', amount: '', direction: 'aller' });
    const [editReceipt, setEditReceipt] = useState(null);
    const [saving, setSaving] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [error, setError] = useState('');

    function refresh() {
        const { dateFrom, dateTo } = monthDateRange(month);
        api.listTrips(auth.token, { dateFrom, dateTo }).then(setTrips);
        api.getMyLedger(auth.token, monthParam(month)).then(setLedger);
    }

    useEffect(() => { refresh(); }, [month]);

    const tripsTotal = trips.reduce((sum, trip) => sum + Number(trip.amount), 0);

    function startEdit(trip) {
        setError('');
        setEditingId(trip.id);
        setEditForm({ tripDate: trip.trip_date.slice(0, 10), amount: trip.amount, direction: trip.direction });
        setEditReceipt(null);
    }

    async function saveEdit(id) {
        setError('');
        setSaving(true);
        const data = new FormData();
        data.append('tripDate', localDateInputToUtcIso(editForm.tripDate));
        data.append('amount', editForm.amount);
        data.append('direction', editForm.direction);
        if (editReceipt) data.append('receipt', editReceipt);
        try {
            await api.updateTrip(auth.token, id, data);
            setEditingId(null);
            refresh();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete() {
        setError('');
        try {
            await api.deleteTrip(auth.token, pendingDelete.id);
            setPendingDelete(null);
            refresh();
        } catch (err) {
            setError(err.message);
            setPendingDelete(null);
        }
    }

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

                <div className="card" style={{ boxShadow: ledger.balance < 0 ? 'inset 0 0 0 1px rgba(240,85,76,0.4)' : undefined }}>
                    <div className="eyebrow">{t('driver.account.balanceEyebrow')}</div>
                    <div style={{ fontSize: 28, fontWeight: 600, marginTop: 6, color: ledger.balance < 0 ? 'var(--danger)' : undefined }}>
                        {formatCurrency(ledger.balance, lang)}
                    </div>
                    <p className="subtle" style={{ marginTop: 4 }}>{t('driver.account.balanceHint')}</p>
                </div>
            </div>

            <div className="eyebrow" style={{ marginTop: 24, marginBottom: 10 }}>{t('driver.account.tripsEyebrow')}</div>
            {error && <div className="pill" style={{ marginBottom: 12, color: 'var(--danger)', background: 'rgba(240,85,76,0.12)' }}>{error}</div>}
            {trips.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">{t('driver.account.tripsEmptyTitle')}</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {trips.map((trip) => (
                        <div key={trip.id} className="card">
                            {editingId === trip.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div className="field">
                                        <label>{t('driver.account.tripsColDate')}</label>
                                        <input className="input" type="date" value={editForm.tripDate} onChange={(e) => setEditForm({ ...editForm, tripDate: e.target.value })} />
                                    </div>
                                    <div className="field">
                                        <label>{t('driver.account.tripsColAmount')}</label>
                                        <input className="input" type="number" step="0.01" inputMode="decimal" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
                                    </div>
                                    <div className="field">
                                        <label>{t('driver.account.tripsColDirection')}</label>
                                        <select className="select" value={editForm.direction} onChange={(e) => setEditForm({ ...editForm, direction: e.target.value })}>
                                            <option value="aller">{t('driver.account.directionAller')}</option>
                                            <option value="retour">{t('driver.account.directionRetour')}</option>
                                            <option value="aller_retour">{t('driver.account.directionAllerRetour')}</option>
                                        </select>
                                    </div>
                                    <div className="field">
                                        <label>{t('driver.tripEntry.receiptLabel')}</label>
                                        <ReceiptPhotoField onChange={setEditReceipt} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button onClick={() => saveEdit(trip.id)} className="btn btn--primary" style={{ flex: 1, padding: '13px 16px' }} disabled={saving}>
                                            {saving ? t('driver.tripEntry.saving') : t('common.save')}
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="btn btn--ghost" style={{ flex: 1, padding: '13px 16px' }} disabled={saving}>{t('common.cancel')}</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{formatDate(trip.trip_date, lang)}</div>
                                            <div className="subtle" style={{ fontSize: 13 }}>{trip.client_name}</div>
                                        </div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 18 }}>{formatCurrency(trip.amount, lang)}</div>
                                    </div>
                                    <div className="subtle" style={{ marginTop: 8 }}>{trip.departure_location} → {trip.arrival_location}</div>
                                    <div className="subtle" style={{ fontSize: 13, marginTop: 2 }}>
                                        {t(`driver.account.direction${trip.direction === 'aller_retour' ? 'AllerRetour' : trip.direction === 'retour' ? 'Retour' : 'Aller'}`)}
                                        {' · '}
                                        {trip.receipt_photo_url ? <a href={receiptUrl(trip.receipt_photo_url)} target="_blank" rel="noreferrer" style={{ color: 'var(--amber)' }}>{t('driver.account.viewReceipt')}</a> : t('driver.account.tripsColReceipt') + ' —'}
                                    </div>
                                    <div style={{ marginTop: 12 }}>
                                        {trip.invoice_id ? (
                                            <span className="subtle">{t('admin.trips.invoiced')}</span>
                                        ) : (
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <button onClick={() => startEdit(trip)} className="btn btn--ghost" style={{ flex: 1, padding: '10px 14px', fontSize: 13 }}>{t('common.edit')}</button>
                                                <button onClick={() => setPendingDelete(trip)} className="btn btn--danger" style={{ flex: 1, padding: '10px 14px', fontSize: 13 }}>{t('common.delete')}</button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
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

            <ConfirmDialog
                open={!!pendingDelete}
                title={t('admin.trips.confirmDeleteTitle')}
                message={pendingDelete ? t('admin.trips.confirmDeleteMessage', { route: `${pendingDelete.departure_location} → ${pendingDelete.arrival_location}`, amount: formatCurrency(pendingDelete.amount, lang) }) : ''}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
