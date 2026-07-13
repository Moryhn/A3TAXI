import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

const statusColors = {
    pending: '#f5b700',
    confirmed: '#34d399',
    cancelled: '#5b6472',
};

function toLocalInputValue(isoString) {
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Reservations() {
    const { auth } = useAuth();
    const [reservations, setReservations] = useState([]);
    const [selected, setSelected] = useState(null);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);

    async function refresh() {
        setReservations(await api.listReservations(auth.token));
    }

    useEffect(() => { refresh(); }, []);

    async function setStatus(id, status) {
        await api.updateReservationStatus(auth.token, id, status);
        setSelected(null);
        refresh();
    }

    function startEdit() {
        setEditForm({
            clientName: selected.client_name,
            clientPhone: selected.client_phone,
            pickupLocation: selected.pickup_location,
            dropoffLocation: selected.dropoff_location,
            requestedTime: toLocalInputValue(selected.requested_time),
        });
        setEditing(true);
    }

    async function saveEdit() {
        const updated = await api.updateReservation(auth.token, selected.id, editForm);
        setSelected(updated);
        setEditing(false);
        refresh();
    }

    async function confirmDelete() {
        await api.deleteReservation(auth.token, pendingDelete.id);
        setPendingDelete(null);
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="page__head" style={{ flexShrink: 0, marginBottom: 10 }}>
                <div>
                    <div className="eyebrow">Reservations</div>
                    <h1 className="h1">Calendar</h1>
                </div>
                <div className="meter meter--sm">{pendingCount}<span className="meter__unit">pending</span></div>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', flex: 1, minHeight: 0 }}>
                <div className="card" style={{ flex: 1, padding: 10, minHeight: 0 }}>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                        events={events}
                        height="100%"
                        expandRows
                        slotDuration="02:00:00"
                        eventClick={(info) => { setSelected(info.event.extendedProps); setEditing(false); }}
                    />
                </div>

                {selected && (
                    <div className="card" style={{ width: 280, flexShrink: 0, overflowY: 'auto' }}>
                        <div className="eyebrow">Request</div>

                        {editing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                                <div className="field">
                                    <label>Name</label>
                                    <input className="input" value={editForm.clientName} onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })} />
                                </div>
                                <div className="field">
                                    <label>Phone</label>
                                    <input className="input" value={editForm.clientPhone} onChange={(e) => setEditForm({ ...editForm, clientPhone: e.target.value })} />
                                </div>
                                <div className="field">
                                    <label>Pickup</label>
                                    <input className="input" value={editForm.pickupLocation} onChange={(e) => setEditForm({ ...editForm, pickupLocation: e.target.value })} />
                                </div>
                                <div className="field">
                                    <label>Drop-off</label>
                                    <input className="input" value={editForm.dropoffLocation} onChange={(e) => setEditForm({ ...editForm, dropoffLocation: e.target.value })} />
                                </div>
                                <div className="field">
                                    <label>Date &amp; time</label>
                                    <input className="input" type="datetime-local" value={editForm.requestedTime} onChange={(e) => setEditForm({ ...editForm, requestedTime: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={saveEdit} className="btn btn--primary" style={{ flex: 1 }}>Save</button>
                                    <button onClick={() => setEditing(false)} className="btn btn--ghost" style={{ flex: 1 }}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
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
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <button onClick={startEdit} className="btn btn--ghost" style={{ flex: 1 }}>Edit</button>
                                    <button onClick={() => setPendingDelete(selected)} className="btn btn--danger" style={{ flex: 1 }}>Delete</button>
                                </div>
                                <button onClick={() => setSelected(null)} className="btn btn--ghost" style={{ marginTop: 8, width: '100%' }}>Close</button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={!!pendingDelete}
                title="Delete this reservation?"
                message={pendingDelete ? `${pendingDelete.client_name} — ${pendingDelete.pickup_location} → ${pendingDelete.dropoff_location}. This can't be undone.` : ''}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
