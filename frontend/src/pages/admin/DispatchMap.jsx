import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import GoogleMapView from '../../components/GoogleMapView.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import PlaceAutocompleteInput from '../../components/PlaceAutocompleteInput.jsx';
import MicButton from '../../components/MicButton.jsx';
import { formatRelativeTime, isStale, localInputToUtcIso } from '../../lib/time.js';

const RESERVATION_SERVICE_TYPES = ['ride', 'battery_boost', 'lockout'];
const DESTINATION_CATEGORIES = ['local', 'airport', 'montreal', 'longDistance'];
const INITIAL_RESERVATION_FORM = {
    clientName: '', clientPhone: '', pickupLocation: '', dropoffLocation: '',
    requestedTime: '', serviceType: 'ride', destinationCategory: 'local',
};

export default function DispatchMap() {
    const { auth } = useAuth();
    const { t, lang } = useLanguage();
    const micLang = lang === 'fr' ? 'fr-CA' : 'en-US';
    const [positions, setPositions] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [job, setJob] = useState({ driverId: '', address: '', dropoffLocation: '', customerPhone: '', notes: '', jobType: 'ride' });
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ address: '', notes: '' });
    const [pendingDelete, setPendingDelete] = useState(null);
    const [assigning, setAssigning] = useState({});
    const [showReservationForm, setShowReservationForm] = useState(false);
    const [resForm, setResForm] = useState(INITIAL_RESERVATION_FORM);
    const [resSubmitting, setResSubmitting] = useState(false);
    const [resStatus, setResStatus] = useState(null);

    async function refresh() {
        setPositions(await api.getDriverPositions(auth.token));
        setDrivers(await api.listDrivers(auth.token));
        setJobs(await api.listAllDispatchJobs(auth.token));
    }

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 15000);
        return () => clearInterval(interval);
    }, []);

    async function handleDispatch(e) {
        e.preventDefault();
        setSending(true);
        setStatus(null);
        try {
            await api.createDispatchJob(auth.token, job);
            setJob({ driverId: '', address: '', dropoffLocation: '', customerPhone: '', notes: '', jobType: 'ride' });
            setStatus({ ok: true, message: t('admin.dispatch.jobSent') });
            refresh();
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setSending(false);
        }
    }

    function startEdit(j) {
        setEditingId(j.id);
        setEditForm({ address: j.address, notes: j.notes || '' });
    }

    async function saveEdit(id) {
        await api.updateDispatchJob(auth.token, id, editForm);
        setEditingId(null);
        refresh();
    }

    async function confirmDelete() {
        await api.deleteDispatchJob(auth.token, pendingDelete.id);
        setPendingDelete(null);
        refresh();
    }

    async function assignDriver(jobId) {
        const driverId = assigning[jobId];
        if (!driverId) return;
        await api.assignDispatchJob(auth.token, jobId, driverId);
        setAssigning((a) => ({ ...a, [jobId]: '' }));
        refresh();
    }

    async function handleCreateReservation(e) {
        e.preventDefault();
        setResSubmitting(true);
        setResStatus(null);
        try {
            await api.createReservation({ ...resForm, requestedTime: localInputToUtcIso(resForm.requestedTime) });
            setResForm(INITIAL_RESERVATION_FORM);
            setResStatus({ ok: true, message: t('admin.dispatch.reservationCreated') });
        } catch (err) {
            setResStatus({ ok: false, message: err.message });
        } finally {
            setResSubmitting(false);
        }
    }

    const isResRide = resForm.serviceType === 'ride';
    const incomingRequests = jobs.filter((j) => !j.driver_id);
    const recentJobs = jobs.filter((j) => j.driver_id);

    return (
        <div>
            <div className="page__head">
                <div>
                    <div className="eyebrow">{t('admin.dispatch.eyebrow')}</div>
                    <h1 className="h1">{t('admin.dispatch.title')}</h1>
                </div>
                <div className="meter meter--sm">
                    {positions.length}<span className="meter__unit">{t('admin.dispatch.onShift')}</span>
                </div>
            </div>

            <div className="dispatch-grid">
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <GoogleMapView positions={positions} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card">
                        <div className="eyebrow">{t('admin.dispatch.sendJobEyebrow')}</div>
                        <form onSubmit={handleDispatch} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                            <select className="select" value={job.driverId} onChange={(e) => setJob({ ...job, driverId: e.target.value })} required>
                                <option value="">{t('admin.dispatch.selectDriver')}</option>
                                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            <select className="select" value={job.jobType} onChange={(e) => setJob({ ...job, jobType: e.target.value })}>
                                <option value="ride">{t('admin.dispatch.jobType.ride')}</option>
                                <option value="battery_boost">{t('admin.dispatch.jobType.battery_boost')}</option>
                                <option value="lockout">{t('admin.dispatch.jobType.lockout')}</option>
                            </select>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <PlaceAutocompleteInput className="input" placeholder={t('admin.dispatch.addressPlaceholder')} value={job.address} onChange={(v) => setJob({ ...job, address: v })} required />
                                </div>
                                <MicButton lang={micLang} title={t('admin.dispatch.speakAddress')} onResult={(text) => setJob({ ...job, address: text })} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <PlaceAutocompleteInput className="input" placeholder={t('admin.dispatch.dropoffPlaceholder')} value={job.dropoffLocation} onChange={(v) => setJob({ ...job, dropoffLocation: v })} />
                                </div>
                            </div>
                            <input className="input" type="tel" placeholder={t('admin.dispatch.phonePlaceholder')} value={job.customerPhone} onChange={(e) => setJob({ ...job, customerPhone: e.target.value })} />
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input className="input" style={{ flex: 1 }} placeholder={t('admin.dispatch.notesPlaceholder')} value={job.notes} onChange={(e) => setJob({ ...job, notes: e.target.value })} />
                                <MicButton lang={micLang} title={t('admin.dispatch.speakNotes')} onResult={(text) => setJob({ ...job, notes: job.notes ? `${job.notes} ${text}` : text })} />
                            </div>
                            <button type="submit" className="btn btn--primary" disabled={sending}>{sending ? t('admin.dispatch.sending') : t('admin.dispatch.sendJob')}</button>
                            {status && (
                                <div
                                    className="pill"
                                    style={{
                                        justifyContent: 'center',
                                        padding: '10px 14px',
                                        color: status.ok ? '#0f8a5f' : 'var(--danger)',
                                        background: status.ok ? 'rgba(52,211,153,0.15)' : 'rgba(240,85,76,0.12)',
                                    }}
                                >
                                    {status.message}
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="eyebrow">{t('admin.dispatch.newReservationEyebrow')}</div>
                            <button type="button" className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setShowReservationForm((v) => !v)}>
                                {showReservationForm ? t('common.cancel') : t('admin.dispatch.newReservationToggle')}
                            </button>
                        </div>
                        {showReservationForm && (
                            <form onSubmit={handleCreateReservation} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                                <div className="tabbar" style={{ width: '100%' }}>
                                    {RESERVATION_SERVICE_TYPES.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            className={`tabbar__btn ${resForm.serviceType === s ? 'tabbar__btn--active' : ''}`}
                                            style={{ flex: 1, fontSize: 11 }}
                                            onClick={() => setResForm({ ...resForm, serviceType: s })}
                                        >
                                            {t(`admin.dispatch.jobType.${s}`)}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input className="input" style={{ flex: 1 }} placeholder={t('admin.reservations.nameLabel')} value={resForm.clientName} onChange={(e) => setResForm({ ...resForm, clientName: e.target.value })} required />
                                    <MicButton lang={micLang} title={t('admin.reservations.speakName')} onResult={(text) => setResForm({ ...resForm, clientName: text })} />
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input className="input" style={{ flex: 1 }} type="tel" placeholder={t('booking.phoneLabel')} value={resForm.clientPhone} onChange={(e) => setResForm({ ...resForm, clientPhone: e.target.value })} required />
                                    <MicButton lang={micLang} title={t('admin.reservations.speakPhone')} onResult={(text) => setResForm({ ...resForm, clientPhone: text })} />
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <PlaceAutocompleteInput className="input" placeholder={t('booking.pickupLabel')} value={resForm.pickupLocation} onChange={(v) => setResForm({ ...resForm, pickupLocation: v })} required />
                                    </div>
                                    <MicButton lang={micLang} title={t('admin.reservations.speakPickup')} onResult={(text) => setResForm({ ...resForm, pickupLocation: text })} />
                                </div>
                                {isResRide && (
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <PlaceAutocompleteInput className="input" placeholder={t('booking.dropoffLabel')} value={resForm.dropoffLocation} onChange={(v) => setResForm({ ...resForm, dropoffLocation: v })} required />
                                        </div>
                                        <MicButton lang={micLang} title={t('admin.reservations.speakDropoff')} onResult={(text) => setResForm({ ...resForm, dropoffLocation: text })} />
                                    </div>
                                )}
                                <input className="input" type="datetime-local" value={resForm.requestedTime} onChange={(e) => setResForm({ ...resForm, requestedTime: e.target.value })} required />
                                {isResRide && (
                                    <div className="tabbar" style={{ width: '100%' }}>
                                        {DESTINATION_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                className={`tabbar__btn ${resForm.destinationCategory === cat ? 'tabbar__btn--active' : ''}`}
                                                style={{ flex: 1, fontSize: 11 }}
                                                onClick={() => setResForm({ ...resForm, destinationCategory: cat })}
                                            >
                                                {t(`booking.destinationCategory.${cat}`)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button type="submit" className="btn btn--primary" disabled={resSubmitting}>
                                    {resSubmitting ? t('admin.dispatch.sending') : t('admin.dispatch.createReservation')}
                                </button>
                                {resStatus && (
                                    <div
                                        className="pill"
                                        style={{
                                            justifyContent: 'center',
                                            padding: '10px 14px',
                                            color: resStatus.ok ? '#0f8a5f' : 'var(--danger)',
                                            background: resStatus.ok ? 'rgba(52,211,153,0.15)' : 'rgba(240,85,76,0.12)',
                                        }}
                                    >
                                        {resStatus.message}
                                    </div>
                                )}
                            </form>
                        )}
                    </div>

                    <div className="card">
                        <div className="eyebrow">{t('admin.dispatch.livePositionsEyebrow')}</div>
                        {positions.length === 0 ? (
                            <p className="subtle" style={{ marginTop: 10 }}>{t('admin.dispatch.noDriversSharing')}</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                                {positions.map((p) => (
                                    <div key={p.driver_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{p.driver_name}</span>
                                        <span
                                            className={isStale(p.recorded_at) ? undefined : 'subtle'}
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 12,
                                                color: isStale(p.recorded_at) ? 'var(--danger)' : undefined,
                                            }}
                                            title={isStale(p.recorded_at) ? t('admin.dispatch.staleTooltip') : undefined}
                                        >
                                            {formatRelativeTime(p.recorded_at, lang)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
                <div className="eyebrow">{t('admin.dispatch.incomingRequestsEyebrow')}</div>
                {incomingRequests.length === 0 ? (
                    <p className="subtle" style={{ marginTop: 10 }}>{t('admin.dispatch.noIncomingRequests')}</p>
                ) : (
                    <div className="table-wrap" style={{ marginTop: 10 }}>
                        <table className="table">
                            <thead><tr><th>{t('admin.dispatch.colPickup')}</th><th>{t('admin.dispatch.colDropoff')}</th><th>{t('admin.dispatch.colPhone')}</th><th>{t('admin.dispatch.colEstimatedPrice')}</th><th>{t('admin.dispatch.colActions')}</th></tr></thead>
                            <tbody>
                                {incomingRequests.map((j) => (
                                    <tr key={j.id}>
                                        <td>{j.address}</td>
                                        <td>{j.dropoff_location || '—'}</td>
                                        <td>{j.customer_phone ? <a href={`tel:${j.customer_phone}`} style={{ color: 'var(--amber)' }}>{j.customer_phone}</a> : '—'}</td>
                                        <td className="subtle">{j.estimated_price != null ? `$${Number(j.estimated_price).toFixed(2)}` : '—'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <select
                                                    className="select"
                                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                                    value={assigning[j.id] || ''}
                                                    onChange={(e) => setAssigning((a) => ({ ...a, [j.id]: e.target.value }))}
                                                >
                                                    <option value="">{t('admin.dispatch.selectDriver')}</option>
                                                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </select>
                                                <button onClick={() => assignDriver(j.id)} className="btn btn--primary" style={{ padding: '6px 12px', fontSize: 12 }} disabled={!assigning[j.id]}>
                                                    {t('admin.dispatch.assign')}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="card" style={{ marginTop: 20 }}>
                <div className="eyebrow">{t('admin.dispatch.recentJobsEyebrow')}</div>
                {recentJobs.length === 0 ? (
                    <p className="subtle" style={{ marginTop: 10 }}>{t('admin.dispatch.noJobsYet')}</p>
                ) : (
                    <div className="table-wrap" style={{ marginTop: 10 }}>
                        <table className="table">
                            <thead><tr><th>{t('admin.dispatch.colDriver')}</th><th>{t('admin.dispatch.colType')}</th><th>{t('admin.dispatch.colAddress')}</th><th>{t('admin.dispatch.colNotes')}</th><th>{t('admin.dispatch.colStatus')}</th><th>{t('admin.dispatch.colActions')}</th></tr></thead>
                            <tbody>
                                {recentJobs.map((j) => (
                                    <tr key={j.id}>
                                        <td>{j.driver_name}</td>
                                        <td className="subtle">{t(`admin.dispatch.jobType.${j.job_type}`)}</td>
                                        {editingId === j.id ? (
                                            <>
                                                <td><input className="input" style={{ padding: '6px 10px' }} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></td>
                                                <td><input className="input" style={{ padding: '6px 10px' }} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></td>
                                                <td><span className={`pill pill--${j.status === 'pending' ? 'pending' : j.status === 'cancelled' ? 'cancelled' : 'confirmed'}`}>{t(`status.${j.status}`)}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button onClick={() => saveEdit(j.id)} className="btn btn--primary" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.save')}</button>
                                                        <button onClick={() => setEditingId(null)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.cancel')}</button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{j.address}</td>
                                                <td className="subtle">{j.notes || '—'}</td>
                                                <td><span className={`pill pill--${j.status === 'pending' ? 'pending' : j.status === 'cancelled' ? 'cancelled' : 'confirmed'}`}>{t(`status.${j.status}`)}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button onClick={() => startEdit(j)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.edit')}</button>
                                                        <button onClick={() => setPendingDelete(j)} className="btn btn--danger" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.delete')}</button>
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
            </div>

            <ConfirmDialog
                open={!!pendingDelete}
                title={t('admin.dispatch.confirmDeleteTitle')}
                message={pendingDelete ? t('admin.dispatch.confirmDeleteMessage', { address: pendingDelete.address, driver: pendingDelete.driver_name }) : ''}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
