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
import { localInputToUtcIso } from '../../lib/time.js';
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
    const [drivers, setDrivers] = useState([]);
    const [selected, setSelected] = useState(null);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [sendDriverId, setSendDriverId] = useState('');
    const [sending, setSending] = useState(false);
    const [sendStatus, setSendStatus] = useState(null);
    const [showCalendarSync, setShowCalendarSync] = useState(false);
    const [feedUrl, setFeedUrl] = useState('');
    const [copyStatus, setCopyStatus] = useState('');

    async function refresh() {
        setReservations(await api.listReservations(auth.token));
    }

    useEffect(() => {
        refresh();
        api.listDrivers(auth.token).then(setDrivers);
    }, []);

    async function toggleCalendarSync() {
        if (!showCalendarSync && !feedUrl) {
            const { feedUrl: url } = await api.getCalendarFeed(auth.token);
            setFeedUrl(url);
        }
        setShowCalendarSync((v) => !v);
    }

    async function copyFeedUrl() {
        await navigator.clipboard.writeText(feedUrl);
        setCopyStatus(t('admin.reservations.copied'));
        setTimeout(() => setCopyStatus(''), 2000);
    }

    async function regenerateFeedUrl() {
        const { feedUrl: url } = await api.regenerateCalendarFeed(auth.token);
        setFeedUrl(url);
    }

    async function sendToDriver() {
        if (!sendDriverId) return;
        setSending(true);
        setSendStatus(null);
        try {
            await api.createDispatchJob(auth.token, {
                driverId: sendDriverId,
                address: selected.pickup_location,
                dropoffLocation: selected.dropoff_location,
                customerPhone: selected.client_phone,
                estimatedPrice: selected.estimated_price,
                jobType: selected.service_type,
                scheduledTime: selected.requested_time,
            });
            setSendStatus({ ok: true, message: t('admin.reservations.sentToDriver') });
            setSendDriverId('');
        } catch (err) {
            setSendStatus({ ok: false, message: err.message });
        } finally {
            setSending(false);
        }
    }

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
        const updated = await api.updateReservation(auth.token, selected.id, {
            ...editForm,
            requestedTime: localInputToUtcIso(editForm.requestedTime),
        });
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
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button onClick={toggleCalendarSync} className="btn btn--ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
                        {t('admin.reservations.calendarSyncToggle')}
                    </button>
                    <div className="meter meter--sm">{pendingCount}<span className="meter__unit">{t('admin.reservations.pending')}</span></div>
                </div>
            </div>

            {showCalendarSync && (
                <div className="card" style={{ flexShrink: 0, marginBottom: 10 }}>
                    <div className="eyebrow">{t('admin.reservations.calendarSyncEyebrow')}</div>
                    <p className="subtle" style={{ marginTop: 6 }}>{t('admin.reservations.calendarSyncInstructions')}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <input className="input" style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12 }} readOnly value={feedUrl} onFocus={(e) => e.target.select()} />
                        <button onClick={copyFeedUrl} className="btn btn--primary" style={{ padding: '8px 14px', fontSize: 12 }}>{t('admin.reservations.copyLink')}</button>
                        <button onClick={regenerateFeedUrl} className="btn btn--ghost" style={{ padding: '8px 14px', fontSize: 12 }}>{t('admin.reservations.regenerateLink')}</button>
                    </div>
                    {copyStatus && <p className="subtle" style={{ marginTop: 6, fontSize: 12 }}>{copyStatus}</p>}
                </div>
            )}

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
                        eventClick={(info) => { setSelected(info.event.extendedProps); setEditing(false); setSendDriverId(''); setSendStatus(null); }}
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
                                    {selected.destination_category && selected.destination_category !== 'local' && (
                                        <span className="pill">{t(`booking.destinationCategory.${selected.destination_category}`)}</span>
                                    )}
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
                                {selected.status !== 'cancelled' && (
                                    <div className="field" style={{ marginBottom: 8 }}>
                                        <label>{t('admin.reservations.sendToDriverLabel')}</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <select className="select" style={{ flex: 1 }} value={sendDriverId} onChange={(e) => setSendDriverId(e.target.value)}>
                                                <option value="">{t('admin.dispatch.selectDriver')}</option>
                                                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                            <button onClick={sendToDriver} className="btn btn--primary" disabled={!sendDriverId || sending}>
                                                {sending ? t('admin.dispatch.sending') : t('admin.reservations.sendBtn')}
                                            </button>
                                        </div>
                                        {sendStatus && (
                                            <p className="subtle" style={{ marginTop: 6, color: sendStatus.ok ? undefined : 'var(--danger)' }}>{sendStatus.message}</p>
                                        )}
                                    </div>
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
