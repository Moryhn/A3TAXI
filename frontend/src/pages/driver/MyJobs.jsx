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
            <h2>My Jobs</h2>
            <button onClick={toggleSharing} style={{ marginBottom: 16 }}>
                {sharing ? 'Stop sharing location' : 'Start sharing location'}
            </button>

            <ul>
                {jobs.map((j) => (
                    <li key={j.id} style={{ marginBottom: 8 }}>
                        <strong>{j.address}</strong> — {j.status}
                        {j.notes && <div>{j.notes}</div>}
                        {j.status === 'pending' && <button onClick={() => updateStatus(j.id, 'accepted')}>Accept</button>}
                        {j.status === 'accepted' && <button onClick={() => updateStatus(j.id, 'completed')}>Mark complete</button>}
                    </li>
                ))}
            </ul>
        </div>
    );
}
