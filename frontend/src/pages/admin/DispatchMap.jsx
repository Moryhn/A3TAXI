import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import GoogleMapView from '../../components/GoogleMapView.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import PlaceAutocompleteInput from '../../components/PlaceAutocompleteInput.jsx';
import MicButton from '../../components/MicButton.jsx';
import { formatRelativeTime, isStale } from '../../lib/time.js';

export default function DispatchMap() {
    const { auth } = useAuth();
    const { t, lang } = useLanguage();
    const micLang = lang === 'fr' ? 'fr-CA' : 'en-US';
    const [positions, setPositions] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [job, setJob] = useState({ driverId: '', address: '', notes: '', jobType: 'ride' });
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ address: '', notes: '' });
    const [pendingDelete, setPendingDelete] = useState(null);

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
            setJob({ driverId: '', address: '', notes: '', jobType: 'ride' });
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
                <div className="eyebrow">{t('admin.dispatch.recentJobsEyebrow')}</div>
                {jobs.length === 0 ? (
                    <p className="subtle" style={{ marginTop: 10 }}>{t('admin.dispatch.noJobsYet')}</p>
                ) : (
                    <div className="table-wrap" style={{ marginTop: 10 }}>
                        <table className="table">
                            <thead><tr><th>{t('admin.dispatch.colDriver')}</th><th>{t('admin.dispatch.colType')}</th><th>{t('admin.dispatch.colAddress')}</th><th>{t('admin.dispatch.colNotes')}</th><th>{t('admin.dispatch.colStatus')}</th><th>{t('admin.dispatch.colActions')}</th></tr></thead>
                            <tbody>
                                {jobs.map((j) => (
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
