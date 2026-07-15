import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { isPushSupported, getExistingPushSubscription, enablePushNotifications, disablePushNotifications } from '../../push.js';

export default function MyJobs() {
    const { auth } = useAuth();
    const { t } = useLanguage();
    const [jobs, setJobs] = useState([]);
    const [sharing, setSharing] = useState(false);
    const [watchId, setWatchId] = useState(null);
    // unsupported | off | on | denied — starts synchronously so the button shows right
    // away instead of staying hidden while async feature checks (serviceWorker.ready,
    // getSubscription) are still pending.
    const [notifState, setNotifState] = useState(() => (isPushSupported() ? 'off' : 'unsupported'));
    const [notifError, setNotifError] = useState('');

    async function refresh() {
        setJobs(await api.listMyJobs(auth.token));
    }

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 20000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!isPushSupported()) return;
        if (Notification.permission === 'denied') {
            setNotifState('denied');
            return;
        }
        getExistingPushSubscription()
            .then((sub) => setNotifState(sub ? 'on' : 'off'))
            .catch(() => {});
    }, []);

    async function toggleNotifications() {
        setNotifError('');
        try {
            if (notifState === 'on') {
                await disablePushNotifications(auth.token);
                setNotifState('off');
            } else {
                await enablePushNotifications(auth.token);
                setNotifState('on');
            }
        } catch (err) {
            if (err.message === 'permission-denied') {
                setNotifState('denied');
            } else {
                setNotifError(err.message || String(err));
            }
        }
    }

    function toggleSharing() {
        if (sharing) {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
            setSharing(false);
            return;
        }

        const id = navigator.geolocation.watchPosition(
            (pos) => {
                api.postDriverPosition(auth.token, pos.coords.latitude, pos.coords.longitude).catch(() => {});
            },
            (err) => console.error('Geolocation error:', err),
            { enableHighAccuracy: true, maximumAge: 10000 }
        );
        setWatchId(id);
        setSharing(true);
    }

    async function updateStatus(id, status) {
        await api.updateJobStatus(auth.token, id, status);
        refresh();
    }

    return (
        <div>
            <div className="eyebrow">{t('driver.myJobs.eyebrow')}</div>
            <h1 className="h1" style={{ fontSize: 26, marginBottom: 16 }}>{t('driver.myJobs.title')}</h1>

            <button
                onClick={toggleSharing}
                className={`btn ${sharing ? 'btn--primary' : 'btn--ghost'}`}
                style={{ width: '100%', padding: '13px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: sharing ? 'var(--amber-ink)' : 'var(--text-muted)', display: 'inline-block' }} />
                {sharing ? t('driver.myJobs.sharingOn') : t('driver.myJobs.sharingOff')}
            </button>

            {notifState !== 'unsupported' && (
                <button
                    onClick={notifState === 'denied' ? undefined : toggleNotifications}
                    className={`btn ${notifState === 'on' ? 'btn--primary' : 'btn--ghost'}`}
                    disabled={notifState === 'denied'}
                    style={{ width: '100%', padding: '13px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: notifState === 'on' ? 'var(--amber-ink)' : 'var(--text-muted)', display: 'inline-block' }} />
                    {notifState === 'denied'
                        ? t('driver.myJobs.notifsDenied')
                        : notifState === 'on'
                        ? t('driver.myJobs.notifsOn')
                        : t('driver.myJobs.notifsOff')}
                </button>
            )}
            {notifError && (
                <p className="subtle" style={{ marginTop: -12, marginBottom: 20, color: 'var(--danger)' }}>{notifError}</p>
            )}

            {jobs.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">{t('driver.myJobs.emptyTitle')}</div>
                    <p>{t('driver.myJobs.emptyBody')}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {jobs.map((j) => (
                        <div key={j.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                <div style={{ fontWeight: 600 }}>{j.address}</div>
                                <span className={`pill pill--${j.status === 'pending' ? 'pending' : j.status === 'cancelled' ? 'cancelled' : 'confirmed'}`}>{t(`status.${j.status}`)}</span>
                            </div>
                            {j.job_type && j.job_type !== 'ride' && (
                                <div className="eyebrow" style={{ marginBottom: 6 }}>{t(`admin.dispatch.jobType.${j.job_type}`)}</div>
                            )}
                            {j.notes && <p className="subtle" style={{ marginBottom: 10 }}>{j.notes}</p>}
                            {j.status === 'pending' && (
                                <button onClick={() => updateStatus(j.id, 'accepted')} className="btn btn--primary" style={{ width: '100%' }}>{t('driver.myJobs.accept')}</button>
                            )}
                            {j.status === 'accepted' && (
                                <button onClick={() => updateStatus(j.id, 'completed')} className="btn btn--primary" style={{ width: '100%' }}>{t('driver.myJobs.markComplete')}</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
