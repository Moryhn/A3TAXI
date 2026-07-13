import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const statusColors = {
    pending: '#e0a800',
    confirmed: '#2e7d32',
    cancelled: '#999',
};

export default function Reservations() {
    const { auth } = useAuth();
    const [reservations, setReservations] = useState([]);
    const [selected, setSelected] = useState(null);

    async function refresh() {
        setReservations(await api.listReservations(auth.token));
    }

    useEffect(() => { refresh(); }, []);

    async function setStatus(id, status) {
        await api.updateReservationStatus(auth.token, id, status);
        setSelected(null);
        refresh();
    }

    const events = reservations.map((r) => ({
        id: String(r.id),
        title: `${r.client_name} — ${r.pickup_location} → ${r.dropoff_location}`,
        start: r.requested_time,
        backgroundColor: statusColors[r.status] || '#666',
        borderColor: statusColors[r.status] || '#666',
        extendedProps: r,
    }));

    return (
        <div>
            <h2>Reservations Calendar</h2>
            <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ flex: 1 }}>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                        events={events}
                        height="auto"
                        eventClick={(info) => setSelected(info.event.extendedProps)}
                    />
                </div>

                {selected && (
                    <div style={{ width: 280, border: '1px solid #ddd', borderRadius: 8, padding: 16, height: 'fit-content' }}>
                        <h3 style={{ marginTop: 0 }}>{selected.client_name}</h3>
                        <p>
                            {new Date(selected.requested_time).toLocaleString()}<br />
                            {selected.pickup_location} → {selected.dropoff_location}<br />
                            {selected.client_phone}
                        </p>
                        <p>Status: <strong>{selected.status}</strong>{selected.sms_sent ? ' · SMS sent' : ''}</p>
                        {selected.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setStatus(selected.id, 'confirmed')}>Confirm</button>
                                <button onClick={() => setStatus(selected.id, 'cancelled')}>Cancel</button>
                            </div>
                        )}
                        <button onClick={() => setSelected(null)} style={{ marginTop: 8 }}>Close</button>
                    </div>
                )}
            </div>
        </div>
    );
}
