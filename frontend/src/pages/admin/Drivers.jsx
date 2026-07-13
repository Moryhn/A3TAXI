import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Drivers() {
    const { auth } = useAuth();
    const [drivers, setDrivers] = useState([]);
    const [form, setForm] = useState({ name: '', phone: '' });

    async function refresh() {
        setDrivers(await api.listDrivers(auth.token));
    }

    useEffect(() => { refresh(); }, []);

    async function handleCreate(e) {
        e.preventDefault();
        await api.createDriver(auth.token, form);
        setForm({ name: '', phone: '' });
        refresh();
    }

    return (
        <div>
            <div className="page__head">
                <div>
                    <div className="eyebrow">Fleet</div>
                    <h1 className="h1">Drivers</h1>
                </div>
                <div className="meter meter--sm">{drivers.length}<span className="meter__unit">on roster</span></div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="eyebrow">Add driver</div>
                <form onSubmit={handleCreate} className="form-row" style={{ marginTop: 10 }}>
                    <div className="field">
                        <label>Name</label>
                        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label>Phone</label>
                        <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn--primary">Add driver</button>
                </form>
                <p className="subtle" style={{ marginTop: 10 }}>An access code is generated automatically — the driver logs in with it, no password needed.</p>
            </div>

            {drivers.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">No drivers yet</div>
                    <p>Add a driver above to generate their login access code.</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>Name</th><th>Phone</th><th>Access code</th></tr></thead>
                        <tbody>
                            {drivers.map((d) => (
                                <tr key={d.id}>
                                    <td>{d.name}</td>
                                    <td className="subtle">{d.phone || '—'}</td>
                                    <td><span className="meter meter--sm">{d.access_code}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
