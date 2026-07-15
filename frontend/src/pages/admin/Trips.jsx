import { useEffect, useState } from 'react';
import { api, receiptUrl } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatDate, formatCurrency } from '../../lib/format.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

export default function Trips() {
    const { auth } = useAuth();
    const { t, lang } = useLanguage();
    const [trips, setTrips] = useState([]);
    const [filters, setFilters] = useState({ clientAccountId: '', dateFrom: '', dateTo: '' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ departureLocation: '', arrivalLocation: '', amount: '' });
    const [pendingDelete, setPendingDelete] = useState(null);
    const [error, setError] = useState('');

    async function refresh() {
        const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
        setTrips(await api.listTrips(auth.token, params));
    }

    useEffect(() => { refresh(); }, []);

    const todayTotal = trips
        .filter((trip) => new Date(trip.trip_date).toDateString() === new Date().toDateString())
        .reduce((sum, trip) => sum + Number(trip.amount), 0);

    function startEdit(trip) {
        setError('');
        setEditingId(trip.id);
        setEditForm({ departureLocation: trip.departure_location, arrivalLocation: trip.arrival_location, amount: trip.amount });
    }

    async function saveEdit(id) {
        setError('');
        try {
            await api.updateTrip(auth.token, id, editForm);
            setEditingId(null);
            refresh();
        } catch (err) {
            setError(err.message);
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
            <div className="page__head">
                <div>
                    <div className="eyebrow">{t('admin.trips.eyebrow')}</div>
                    <h1 className="h1">{t('admin.trips.title')}</h1>
                </div>
                <div className="meter meter--sm">{formatCurrency(todayTotal, lang)}<span className="meter__unit">{t('admin.trips.today')}</span></div>
            </div>

            <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="field">
                    <label>{t('admin.trips.fromLabel')}</label>
                    <input className="input" type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
                </div>
                <div className="field">
                    <label>{t('admin.trips.toLabel')}</label>
                    <input className="input" type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
                </div>
                <button onClick={refresh} className="btn btn--ghost">{t('admin.trips.filter')}</button>
            </div>

            {error && <div className="pill" style={{ marginBottom: 12, color: 'var(--danger)', background: 'rgba(240,85,76,0.12)' }}>{error}</div>}

            {trips.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">{t('admin.trips.emptyTitle')}</div>
                    <p>{t('admin.trips.emptyBody')}</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr><th>{t('admin.trips.colDate')}</th><th>{t('admin.trips.colDriver')}</th><th>{t('admin.trips.colClient')}</th><th>{t('admin.trips.colRoute')}</th><th>{t('admin.trips.colAmount')}</th><th>{t('admin.trips.colReceipt')}</th><th>{t('admin.trips.colActions')}</th></tr>
                        </thead>
                        <tbody>
                            {trips.map((trip) => (
                                <tr key={trip.id}>
                                    <td className="subtle">{formatDate(trip.trip_date, lang)}</td>
                                    <td>{trip.driver_name}</td>
                                    <td>{trip.client_name}</td>
                                    {editingId === trip.id ? (
                                        <>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <input className="input" style={{ padding: '6px 8px', width: 110 }} value={editForm.departureLocation} onChange={(e) => setEditForm({ ...editForm, departureLocation: e.target.value })} />
                                                    <input className="input" style={{ padding: '6px 8px', width: 110 }} value={editForm.arrivalLocation} onChange={(e) => setEditForm({ ...editForm, arrivalLocation: e.target.value })} />
                                                </div>
                                            </td>
                                            <td><input className="input" type="number" step="0.01" style={{ padding: '6px 8px', width: 80 }} value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} /></td>
                                            <td>{trip.receipt_photo_url ? <a href={receiptUrl(trip.receipt_photo_url)} target="_blank" rel="noreferrer" style={{ color: 'var(--amber)' }}>{t('admin.trips.view')}</a> : <span className="subtle">—</span>}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => saveEdit(trip.id)} className="btn btn--primary" style={{ padding: '6px 12px', fontSize: 12 }}>{t('admin.trips.save')}</button>
                                                    <button onClick={() => setEditingId(null)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('admin.trips.cancel')}</button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{trip.departure_location} → {trip.arrival_location}</td>
                                            <td><span className="meter meter--sm">{formatCurrency(trip.amount, lang)}</span></td>
                                            <td>{trip.receipt_photo_url ? <a href={receiptUrl(trip.receipt_photo_url)} target="_blank" rel="noreferrer" style={{ color: 'var(--amber)' }}>{t('admin.trips.view')}</a> : <span className="subtle">—</span>}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    {trip.invoice_id ? (
                                                        <span className="subtle" title={t('admin.trips.invoiced')}>{t('admin.trips.invoiced')}</span>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => startEdit(trip)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('admin.trips.edit')}</button>
                                                            <button onClick={() => setPendingDelete(trip)} className="btn btn--danger" style={{ padding: '6px 12px', fontSize: 12 }}>{t('admin.trips.delete')}</button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </>
                                    )}
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
