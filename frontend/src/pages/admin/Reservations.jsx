import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const statusColors = {
    pending: '#f5b700',
    confirmed: '#34d399',
    cancelled: '#5b6472',
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
        textColor: r.status === 'pending' ? '#1b1b0d' : '#0c0f12',
        extendedProps: r,
    }));

    const pendingCount = reservations.filter((r) => r.status === 'pending').length;

    return (
        <div>
            <div className="page__head">
                <div>
                    <div className="eyebrow">Reservations</div>
                    <h1 className="h1">Calendar</h1>
                </div>
                <div className="meter meter--sm">{pendingCount}<span className="meter__unit">pending</span></div>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div className="card" style={{ flex: 1, padding: 16 }}>
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
                    <div className="card" style={{ width: 280, flexShrink: 0 }}>
                        <div className="eyebrow">Request</div>
                        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{selected.client_name}</div>
                        <p className="subtle" style={{ lineHeight: 1.6 }}>
                            {new Date(selected.requested_time).toLocaleString()}<br />
                            {selected.pickup_location} → {selected.dropoff_location}<br />
                            {selected.client_phone}
                        </p>
                        <div style={{ margin: '10px 0' }}>
                            <span className={`pill pill--${selected.status}`}>{selected.status}</span>
                            {selected.sms_sent && <span className="subtle" style={{ marginLeft: 8 }}>SMS sent</span>}
                        </div>
                        {selected.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <button onClick={() => setStatus(selected.id, 'confirmed')} className="btn btn--primary" style={{ flex: 1 }}>Confirm</button>
                                <button onClick={() => setStatus(selected.id, 'cancelled')} className="btn btn--danger" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        )}
                        <button onClick={() => setSelected(null)} className="btn btn--ghost" style={{ marginTop: 8, width: '100%' }}>Close</button>
                    </div>
                )}
            </div>
        </div>
    );
}
