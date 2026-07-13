import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
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

    return (
        <div>
            <h2>Trips</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
                <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
                <button onClick={refresh}>Filter</button>
            </div>
            <table>
                <thead>
                    <tr><th>Date</th><th>Driver</th><th>Client</th><th>Route</th><th>Amount</th><th>Receipt</th></tr>
                </thead>
                <tbody>
                    {trips.map((t) => (
                        <tr key={t.id}>
                            <td>{new Date(t.trip_date).toLocaleDateString()}</td>
                            <td>{t.driver_name}</td>
                            <td>{t.client_name}</td>
                            <td>{t.departure_location} → {t.arrival_location}</td>
                            <td>${Number(t.amount).toFixed(2)}</td>
                            <td>{t.receipt_photo_url ? <a href={t.receipt_photo_url} target="_blank" rel="noreferrer">View</a> : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
