import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import GoogleMapView from '../../components/GoogleMapView.jsx';

export default function DispatchMap() {
    const { auth } = useAuth();
    const [positions, setPositions] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [job, setJob] = useState({ driverId: '', address: '', notes: '' });

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
        await api.createDispatchJob(auth.token, job);
        setJob({ driverId: '', address: '', notes: '' });
    }

    return (
        <div>
            <h2>Dispatch</h2>
            <div style={{ marginBottom: 16 }}>
                <GoogleMapView positions={positions} />
            </div>

            <h3>Live Driver Positions</h3>
            <table>
                <thead><tr><th>Driver</th><th>Lat</th><th>Lng</th><th>Last update</th></tr></thead>
                <tbody>
                    {positions.map((p) => (
                        <tr key={p.driver_id}>
                            <td>{p.driver_name}</td><td>{p.lat}</td><td>{p.lng}</td>
                            <td>{new Date(p.recorded_at).toLocaleTimeString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h3>Dispatch a Job</h3>
            <form onSubmit={handleDispatch} style={{ display: 'flex', gap: 8 }}>
                <select value={job.driverId} onChange={(e) => setJob({ ...job, driverId: e.target.value })} required>
                    <option value="">Select driver</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input placeholder="Address" value={job.address} onChange={(e) => setJob({ ...job, address: e.target.value })} required />
                <input placeholder="Notes" value={job.notes} onChange={(e) => setJob({ ...job, notes: e.target.value })} />
                <button type="submit">Send job</button>
            </form>
        </div>
    );
}
