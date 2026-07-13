import { useEffect, useState } from 'react';
import { api, API_ORIGIN } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Trips() {
    const { auth } = useAuth();
    const [trips, setTrips] = useState([]);
    const [filters, setFilters] = useState({ clientAccountId: '', dateFrom: '', dateTo: '' });

    async function refresh() {
        const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
        setTrips(await api.listTrips(auth.token, params));
    }

    useEffect(() => { refresh(); }, []);

    const todayTotal = trips
        .filter((t) => new Date(t.trip_date).toDateString() === new Date().toDateString())
        .reduce((sum, t) => sum + Number(t.amount), 0);

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

            {trips.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">No trips yet</div>
                    <p>Trips logged by drivers will show up here.</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr><th>Date</th><th>Driver</th><th>Client</th><th>Route</th><th>Amount</th><th>Receipt</th></tr>
                        </thead>
                        <tbody>
                            {trips.map((t) => (
                                <tr key={t.id}>
                                    <td className="subtle">{new Date(t.trip_date).toLocaleDateString()}</td>
                                    <td>{t.driver_name}</td>
                                    <td>{t.client_name}</td>
                                    <td>{t.departure_location} → {t.arrival_location}</td>
                                    <td><span className="meter meter--sm">${Number(t.amount).toFixed(2)}</span></td>
                                    <td>{t.receipt_photo_url ? <a href={`${API_ORIGIN}${t.receipt_photo_url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--amber)' }}>View</a> : <span className="subtle">—</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
