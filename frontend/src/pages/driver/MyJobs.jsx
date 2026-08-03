import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { isPushSupported, getExistingPushSubscription, enablePushNotifications, disablePushNotifications } from '../../push.js';
import { formatDateTime } from '../../lib/format.js';
import QuickMessageSender from '../../components/QuickMessageSender.jsx';

const SHARING_KEY = 'a3taxi_driver_sharing';

// Tracked at module scope, not component state — a phone that sits idle
// auto-locks its screen, which suspends this page's JS and drops the driver
// off the live map within 90s (the admin's staleness threshold). Keeping the
// watcher/wake-lock handles here means a re-mount of this page (route change,
// or the OS reloading a backgrounded tab) can detect one is already running
// instead of quietly starting a duplicate.
let activeWatchId = null;
let activeWakeLock = null;

async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
        activeWakeLock = await navigator.wakeLock.request('screen');
    } catch {
        // Not fatal — position sharing still works, the screen just isn't
        // held awake (e.g. low battery mode can refuse the lock on some phones).
    }
}

function releaseWakeLock() {
    activeWakeLock?.release().catch(() => {});
    activeWakeLock = null;
}

export default function MyJobs() {
    const { auth } = useAuth();
    const { t, lang } = useLanguage();
    const [jobs, setJobs] = useState([]);
    const [sharing, setSharing] = useState(() => activeWatchId !== null);
    // unsupported | off | on | denied — starts synchronously so the button shows right
    // away instead of staying hidden while async feature checks (serviceWorker.ready,
    // getSubscription) are still pending.
    const [notifState, setNotifState] = useState(() => (isPushSupported() ? 'off' : 'unsupported'));
    const [notifError, setNotifError] = useState('');
    const authRef = useRef(auth);
    authRef.current = auth;

    async function refresh() {
        setJobs(await api.listMyJobs(auth.token));
    }

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 20000);
        return () => clearInterval(interval);
    }, []);

    function startWatch() {
        activeWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                api.postDriverPosition(authRef.current.token, pos.coords.latitude, pos.coords.longitude).catch(() => {});
            },
            (err) => console.error('Geolocation error:', err),
            { enableHighAccuracy: true, maximumAge: 10000 }
        );
    }

    // A screen that auto-locks from inactivity is exactly what suspends this
    // page's JS and stops position updates — the Wake Lock keeps the screen
    // (and this tab) awake for as long as sharing stays on. If the OS still
    // reclaims the tab in the background and later reloads it, the effect
    // below picks the sharing preference back up from localStorage on mount
    // instead of leaving the driver silently unshared without realizing.
    useEffect(() => {
        if (localStorage.getItem(SHARING_KEY) === '1' && activeWatchId === null) {
            startWatch();
            acquireWakeLock();
            setSharing(true);
        }

        function onVisibilityChange() {
            if (document.visibilityState !== 'visible' || activeWatchId === null) return;
            acquireWakeLock();
            navigator.geolocation.getCurrentPosition(
                (pos) => api.postDriverPosition(authRef.current.token, pos.coords.latitude, pos.coords.longitude).catch(() => {}),
                () => {},
                { enableHighAccuracy: true, maximumAge: 0 }
            );
        }
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
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
            if (activeWatchId !== null) navigator.geolocation.clearWatch(activeWatchId);
            activeWatchId = null;
            releaseWakeLock();
            localStorage.removeItem(SHARING_KEY);
            setSharing(false);
            return;
        }

        startWatch();
        acquireWakeLock();
        localStorage.setItem(SHARING_KEY, '1');
        setSharing(true);
    }

    async function updateStatus(id, status) {
        await api.updateJobStatus(auth.token, id, status);
        refresh();
    }

    // window.open must run synchronously inside the click handler (before any
    // await) or mobile browsers treat it as an unrequested popup and block it.
    // Navigates to the client's location (job.address) — where the driver needs
    // to go to pick them up, not the drop-off.
    function acceptJob(job) {
        window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}&travelmode=driving`,
            '_blank',
            'noopener,noreferrer'
        );
        updateStatus(job.id, 'accepted');
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

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>{t('driver.quickMessages.eyebrow')}</div>
                <QuickMessageSender />
            </div>

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
                            {j.scheduled_time && (
                                <p className="subtle" style={{ marginBottom: 6, fontWeight: 600 }}>{formatDateTime(j.scheduled_time, lang)}</p>
                            )}
                            {j.dropoff_location && (
                                <p className="subtle" style={{ marginBottom: 6 }}>→ {j.dropoff_location}</p>
                            )}
                            {j.notes && <p className="subtle" style={{ marginBottom: 10 }}>{j.notes}</p>}
                            {j.status === 'pending' && (
                                <button onClick={() => acceptJob(j)} className="btn btn--primary" style={{ width: '100%' }}>{t('driver.myJobs.accept')}</button>
                            )}
                            {j.status === 'accepted' && (
                                <button onClick={() => updateStatus(j.id, 'completed')} className="btn btn--primary" style={{ width: '100%' }}>{t('driver.myJobs.markComplete')}</button>
                            )}
                            {j.status === 'completed' && j.customer_phone && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                    <QuickMessageSender phone={j.customer_phone} jobId={j.id} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
