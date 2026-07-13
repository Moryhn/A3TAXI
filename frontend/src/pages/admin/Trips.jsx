import { useEffect, useState } from 'react';
import { api, API_ORIGIN } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

export default function Trips() {
    const { auth } = useAuth();
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
        .filter((t) => new Date(t.trip_date).toDateString() === new Date().toDateString())
        .reduce((sum, t) => sum + Number(t.amount), 0);

    function startEdit(t) {
        setError('');
        setEditingId(t.id);
        setEditForm({ departureLocation: t.departure_location, arrivalLocation: t.arrival_location, amount: t.amount });
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
                    <div className="eyebrow">Billing</div>
                    <h1 className="h1">Trips</h1>
                </div>
                <div className="meter meter--sm">${todayTotal.toFixed(2)}<span className="meter__unit">today</span></div>
            </div>

            <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="field">
                    <label>From</label>
                    <input className="input" type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
                </div>
                <div className="field">
                    <label>To</label>
                    <input className="input" type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
                </div>
                <button onClick={refresh} className="btn btn--ghost">Filter</button>
            </div>

            {error && <div className="pill" style={{ marginBottom: 12, color: 'var(--danger)', background: 'rgba(240,85,76,0.12)' }}>{error}</div>}

            {trips.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">No trips yet</div>
                    <p>Trips logged by drivers will show up here.</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr><th>Date</th><th>Driver</th><th>Client</th><th>Route</th><th>Amount</th><th>Receipt</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {trips.map((t) => (
                                <tr key={t.id}>
                                    <td className="subtle">{new Date(t.trip_date).toLocaleDateString()}</td>
                                    <td>{t.driver_name}</td>
                                    <td>{t.client_name}</td>
                                    {editingId === t.id ? (
                                        <>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <input className="input" style={{ padding: '6px 8px', width: 110 }} value={editForm.departureLocation} onChange={(e) => setEditForm({ ...editForm, departureLocation: e.target.value })} />
                                                    <input className="input" style={{ padding: '6px 8px', width: 110 }} value={editForm.arrivalLocation} onChange={(e) => setEditForm({ ...editForm, arrivalLocation: e.target.value })} />
                                                </div>
                                            </td>
                                            <td><input className="input" type="number" step="0.01" style={{ padding: '6px 8px', width: 80 }} value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} /></td>
                                            <td>{t.receipt_photo_url ? <a href={`${API_ORIGIN}${t.receipt_photo_url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--amber)' }}>View</a> : <span className="subtle">—</span>}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => saveEdit(t.id)} className="btn btn--primary" style={{ padding: '6px 12px', fontSize: 12 }}>Save</button>
                                                    <button onClick={() => setEditingId(null)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Cancel</button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{t.departure_location} → {t.arrival_location}</td>
                                            <td><span className="meter meter--sm">${Number(t.amount).toFixed(2)}</span></td>
                                            <td>{t.receipt_photo_url ? <a href={`${API_ORIGIN}${t.receipt_photo_url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--amber)' }}>View</a> : <span className="subtle">—</span>}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    {t.invoice_id ? (
                                                        <span className="subtle" title="Already invoiced">Invoiced</span>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => startEdit(t)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Edit</button>
                                                            <button onClick={() => setPendingDelete(t)} className="btn btn--danger" style={{ padding: '6px 12px', fontSize: 12 }}>Delete</button>
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
                title="Delete this trip?"
                message={pendingDelete ? `${pendingDelete.departure_location} → ${pendingDelete.arrival_location}, $${Number(pendingDelete.amount).toFixed(2)}. This can't be undone.` : ''}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
