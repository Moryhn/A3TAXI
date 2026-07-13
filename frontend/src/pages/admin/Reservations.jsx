import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frCaLocale from '@fullcalendar/core/locales/fr-ca';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatDateTime, formatCurrency } from '../../lib/format.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import MicButton from '../../components/MicButton.jsx';

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
    const { t, lang } = useLanguage();
    const micLang = lang === 'fr' ? 'fr-CA' : 'en-US';
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
        title: r.dropoff_location
            ? `${r.client_name} — ${r.pickup_location} → ${r.dropoff_location}`
            : `${r.client_name} — ${t(`admin.reservations.serviceType.${r.service_type}`)} — ${r.pickup_location}`,
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
                    <div className="eyebrow">{t('admin.reservations.eyebrow')}</div>
                    <h1 className="h1">{t('admin.reservations.title')}</h1>
                </div>
                <div className="meter meter--sm">{pendingCount}<span className="meter__unit">{t('admin.reservations.pending')}</span></div>
            </div>

            <div className="reservations-row">
                <div className="card" style={{ flex: 1, padding: 10, minHeight: 0 }}>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        locale={lang === 'fr' ? frCaLocale : 'en'}
                        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                        events={events}
                        height="100%"
                        expandRows
                        slotDuration="02:00:00"
                        slotMaxTime="24:30:00"
                        eventClick={(info) => { setSelected(info.event.extendedProps); setEditing(false); }}
                    />
                </div>

                {selected && (
                    <div className="card" style={{ width: 280, flexShrink: 0, overflowY: 'auto' }}>
                        <div className="eyebrow">{t('admin.reservations.requestEyebrow')}</div>

                        {editing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                                <div className="field">
                                    <label>{t('admin.reservations.nameLabel')}</label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input className="input" style={{ flex: 1 }} value={editForm.clientName} onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })} />
                                        <MicButton lang={micLang} title={t('admin.reservations.speakName')} onResult={(text) => setEditForm({ ...editForm, clientName: text })} />
                                    </div>
                                </div>
                                <div className="field">
                                    <label>{t('admin.reservations.phoneLabel')}</label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input className="input" style={{ flex: 1 }} value={editForm.clientPhone} onChange={(e) => setEditForm({ ...editForm, clientPhone: e.target.value })} />
                                        <MicButton lang={micLang} title={t('admin.reservations.speakPhone')} onResult={(text) => setEditForm({ ...editForm, clientPhone: text })} />
                                    </div>
                                </div>
                                <div className="field">
                                    <label>{t('admin.reservations.pickupLabel')}</label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input className="input" style={{ flex: 1 }} value={editForm.pickupLocation} onChange={(e) => setEditForm({ ...editForm, pickupLocation: e.target.value })} />
                                        <MicButton lang={micLang} title={t('admin.reservations.speakPickup')} onResult={(text) => setEditForm({ ...editForm, pickupLocation: text })} />
                                    </div>
                                </div>
                                <div className="field">
                                    <label>{t('admin.reservations.dropoffLabel')}</label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input className="input" style={{ flex: 1 }} value={editForm.dropoffLocation} onChange={(e) => setEditForm({ ...editForm, dropoffLocation: e.target.value })} />
                                        <MicButton lang={micLang} title={t('admin.reservations.speakDropoff')} onResult={(text) => setEditForm({ ...editForm, dropoffLocation: text })} />
                                    </div>
                                </div>
                                <div className="field">
                                    <label>{t('admin.reservations.dateTimeLabel')}</label>
                                    <input className="input" type="datetime-local" value={editForm.requestedTime} onChange={(e) => setEditForm({ ...editForm, requestedTime: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={saveEdit} className="btn btn--primary" style={{ flex: 1 }}>{t('admin.reservations.save')}</button>
                                    <button onClick={() => setEditing(false)} className="btn btn--ghost" style={{ flex: 1 }}>{t('admin.reservations.cancel')}</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{selected.client_name}</div>
                                <p className="subtle" style={{ lineHeight: 1.6 }}>
                                    {formatDateTime(selected.requested_time, lang)}<br />
                                    {selected.dropoff_location ? `${selected.pickup_location} → ${selected.dropoff_location}` : selected.pickup_location}<br />
                                    {selected.client_phone}
                                </p>
                                <div style={{ margin: '10px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <span className={`pill pill--${selected.status}`}>{t(`status.${selected.status}`)}</span>
                                    <span className="pill">{t(`admin.reservations.serviceType.${selected.service_type}`)}</span>
                                    {selected.is_round_trip && <span className="pill">{t('booking.roundTripLabel')}</span>}
                                    {selected.sms_sent && <span className="subtle" style={{ marginLeft: 8, alignSelf: 'center' }}>{t('admin.reservations.smsSent')}</span>}
                                </div>
                                {selected.service_type === 'ride' && (
                                    <p className="subtle" style={{ lineHeight: 1.6, marginBottom: 8 }}>
                                        {t('admin.reservations.passengersShort', { count: selected.passenger_count })}
                                        {(selected.carry_on_count > 0 || selected.checked_luggage_count > 0) &&
                                            ` · ${t('admin.reservations.luggageShort', { carryOn: selected.carry_on_count, checked: selected.checked_luggage_count })}`}
                                    </p>
                                )}
                                {selected.estimated_price != null && (
                                    <div className="meter meter--sm" style={{ marginBottom: 8 }}>{formatCurrency(selected.estimated_price, lang)}</div>
                                )}
                                {selected.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                        <button onClick={() => setStatus(selected.id, 'confirmed')} className="btn btn--primary" style={{ flex: 1 }}>{t('admin.reservations.confirmBtn')}</button>
                                        <button onClick={() => setStatus(selected.id, 'cancelled')} className="btn btn--danger" style={{ flex: 1 }}>{t('admin.reservations.cancelStatusBtn')}</button>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <button onClick={startEdit} className="btn btn--ghost" style={{ flex: 1 }}>{t('admin.reservations.edit')}</button>
                                    <button onClick={() => setPendingDelete(selected)} className="btn btn--danger" style={{ flex: 1 }}>{t('admin.reservations.delete')}</button>
                                </div>
                                <button onClick={() => setSelected(null)} className="btn btn--ghost" style={{ marginTop: 8, width: '100%' }}>{t('admin.reservations.close')}</button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={!!pendingDelete}
                title={t('admin.reservations.confirmDeleteTitle')}
                message={pendingDelete ? t('admin.reservations.confirmDeleteMessageRoute', {
                    name: pendingDelete.client_name,
                    route: pendingDelete.dropoff_location
                        ? `${pendingDelete.pickup_location} → ${pendingDelete.dropoff_location}`
                        : pendingDelete.pickup_location,
                }) : ''}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
