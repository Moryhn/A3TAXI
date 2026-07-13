import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ClientAccounts() {
    const { auth } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [form, setForm] = useState({ name: '', code: '' });

    async function refresh() {
        setAccounts(await api.listClientAccounts(auth.token));
    }

    useEffect(() => { refresh(); }, []);

    async function handleCreate(e) {
        e.preventDefault();
        await api.createClientAccount(auth.token, form);
        setForm({ name: '', code: '' });
        refresh();
    }

    return (
        <div>
            <h2>Client Accounts</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                <button type="submit">Add client</button>
            </form>
            <table>
                <thead><tr><th>Code</th><th>Name</th><th>Active</th></tr></thead>
                <tbody>
                    {accounts.map((a) => (
                        <tr key={a.id}><td>{a.code}</td><td>{a.name}</td><td>{a.is_active ? 'Yes' : 'No'}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
