import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function MyJobs() {
    const { auth } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [sharing, setSharing] = useState(false);
    const [watchId, setWatchId] = useState(null);

    async function refresh() {
        setJobs(await api.listMyJobs(auth.token));
    }

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 20000);
        return () => clearInterval(interval);
    }, []);

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
            <div className="eyebrow">On shift</div>
            <h1 className="h1" style={{ fontSize: 26, marginBottom: 16 }}>My jobs</h1>

            <button
                onClick={toggleSharing}
                className={`btn ${sharing ? 'btn--primary' : 'btn--ghost'}`}
                style={{ width: '100%', padding: '13px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: sharing ? 'var(--amber-ink)' : 'var(--text-muted)', display: 'inline-block' }} />
                {sharing ? 'Sharing location' : 'Start sharing location'}
            </button>

            {jobs.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">No jobs yet</div>
                    <p>Dispatched jobs will show up here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {jobs.map((j) => (
                        <div key={j.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                <div style={{ fontWeight: 600 }}>{j.address}</div>
                                <span className={`pill pill--${j.status === 'pending' ? 'pending' : j.status === 'cancelled' ? 'cancelled' : 'confirmed'}`}>{j.status}</span>
                            </div>
                            {j.notes && <p className="subtle" style={{ marginBottom: 10 }}>{j.notes}</p>}
                            {j.status === 'pending' && (
                                <button onClick={() => updateStatus(j.id, 'accepted')} className="btn btn--primary" style={{ width: '100%' }}>Accept</button>
                            )}
                            {j.status === 'accepted' && (
                                <button onClick={() => updateStatus(j.id, 'completed')} className="btn btn--primary" style={{ width: '100%' }}>Mark complete</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
