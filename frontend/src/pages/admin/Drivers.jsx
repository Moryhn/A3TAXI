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
            <h2>Drivers</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <button type="submit">Add driver (generates access code)</button>
            </form>
            <table>
                <thead><tr><th>Name</th><th>Phone</th><th>Access Code</th></tr></thead>
                <tbody>
                    {drivers.map((d) => (
                        <tr key={d.id}><td>{d.name}</td><td>{d.phone}</td><td>{d.access_code}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
