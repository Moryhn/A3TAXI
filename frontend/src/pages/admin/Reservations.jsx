import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Reservations() {
    const { auth } = useAuth();
    const [reservations, setReservations] = useState([]);

    async function refresh() {
        setReservations(await api.listReservations(auth.token));
    }

    useEffect(() => { refresh(); }, []);

    async function setStatus(id, status) {
        await api.updateReservationStatus(auth.token, id, status);
        refresh();
    }

    return (
        <div>
            <h2>Reservations Calendar</h2>
            <p style={{ color: '#666', fontSize: 14 }}>Simple list view for now — swap for a calendar component (e.g. FullCalendar) when prioritized.</p>
            <table>
                <thead><tr><th>Requested</th><th>Client</th><th>Phone</th><th>Route</th><th>Status</th><th>SMS</th><th></th></tr></thead>
                <tbody>
                    {reservations.map((r) => (
                        <tr key={r.id}>
                            <td>{new Date(r.requested_time).toLocaleString()}</td>
                            <td>{r.client_name}</td>
                            <td>{r.client_phone}</td>
                            <td>{r.pickup_location} → {r.dropoff_location}</td>
                            <td>{r.status}</td>
                            <td>{r.sms_sent ? 'Sent' : '—'}</td>
                            <td>
                                {r.status === 'pending' && (
                                    <button onClick={() => setStatus(r.id, 'confirmed')}>Confirm</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
