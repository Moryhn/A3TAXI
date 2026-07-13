import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import GoogleMapView from '../../components/GoogleMapView.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

export default function DispatchMap() {
    const { auth } = useAuth();
    const [positions, setPositions] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [job, setJob] = useState({ driverId: '', address: '', notes: '' });
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
            setJob({ driverId: '', address: '', notes: '' });
            setStatus({ ok: true, message: 'Job sent.' });
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
                    <div className="eyebrow">Live board</div>
                    <h1 className="h1">Dispatch</h1>
                </div>
                <div className="meter meter--sm">
                    {positions.length}<span className="meter__unit">on shift</span>
                </div>
            </div>

            <div className="dispatch-grid">
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

            <div className="card" style={{ marginTop: 20 }}>
                <div className="eyebrow">Recent jobs</div>
                {jobs.length === 0 ? (
                    <p className="subtle" style={{ marginTop: 10 }}>No jobs dispatched yet.</p>
                ) : (
                    <div className="table-wrap" style={{ marginTop: 10 }}>
                        <table className="table">
                            <thead><tr><th>Driver</th><th>Address</th><th>Notes</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {jobs.map((j) => (
                                    <tr key={j.id}>
                                        <td>{j.driver_name}</td>
                                        {editingId === j.id ? (
                                            <>
                                                <td><input className="input" style={{ padding: '6px 10px' }} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></td>
                                                <td><input className="input" style={{ padding: '6px 10px' }} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></td>
                                                <td><span className={`pill pill--${j.status === 'pending' ? 'pending' : j.status === 'cancelled' ? 'cancelled' : 'confirmed'}`}>{j.status}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button onClick={() => saveEdit(j.id)} className="btn btn--primary" style={{ padding: '6px 12px', fontSize: 12 }}>Save</button>
                                                        <button onClick={() => setEditingId(null)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Cancel</button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{j.address}</td>
                                                <td className="subtle">{j.notes || '—'}</td>
                                                <td><span className={`pill pill--${j.status === 'pending' ? 'pending' : j.status === 'cancelled' ? 'cancelled' : 'confirmed'}`}>{j.status}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button onClick={() => startEdit(j)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Edit</button>
                                                        <button onClick={() => setPendingDelete(j)} className="btn btn--danger" style={{ padding: '6px 12px', fontSize: 12 }}>Delete</button>
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
                title="Delete this job?"
                message={pendingDelete ? `${pendingDelete.address} — assigned to ${pendingDelete.driver_name}. It'll move to Trash, where you can restore it later.` : ''}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
