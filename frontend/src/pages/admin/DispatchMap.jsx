import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import GoogleMapView from '../../components/GoogleMapView.jsx';

export default function DispatchMap() {
    const { auth } = useAuth();
    const [positions, setPositions] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [job, setJob] = useState({ driverId: '', address: '', notes: '' });
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);

    async function refresh() {
        setPositions(await api.getDriverPositions(auth.token));
        setDrivers(await api.listDrivers(auth.token));
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
            setJob({ driverId: '', address: '', notes: '' });
            setStatus({ ok: true, message: 'Job sent.' });
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setSending(false);
        }
    }

    return (
        <div>
            <div className="page__head">
                <div>
                    <div className="eyebrow">Live board</div>
                    <h1 className="h1">Dispatch</h1>
                </div>
                <div className="meter meter--sm">
                    {positions.length}<span className="meter__unit">on shift</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <GoogleMapView positions={positions} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card">
                        <div className="eyebrow">Send a job</div>
                        <form onSubmit={handleDispatch} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                            <select className="select" value={job.driverId} onChange={(e) => setJob({ ...job, driverId: e.target.value })} required>
                                <option value="">Select driver</option>
                                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            <input className="input" placeholder="Address" value={job.address} onChange={(e) => setJob({ ...job, address: e.target.value })} required />
                            <input className="input" placeholder="Notes (optional)" value={job.notes} onChange={(e) => setJob({ ...job, notes: e.target.value })} />
                            <button type="submit" className="btn btn--primary" disabled={sending}>{sending ? 'Sending…' : 'Send job'}</button>
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
                        <div className="eyebrow">Live positions</div>
                        {positions.length === 0 ? (
                            <p className="subtle" style={{ marginTop: 10 }}>No drivers are sharing location right now.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                                {positions.map((p) => (
                                    <div key={p.driver_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{p.driver_name}</span>
                                        <span className="subtle" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                            {new Date(p.recorded_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
