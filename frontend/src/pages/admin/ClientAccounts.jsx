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
            <div className="page__head">
                <div>
                    <div className="eyebrow">Billing</div>
                    <h1 className="h1">Client accounts</h1>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="eyebrow">Add client</div>
                <form onSubmit={handleCreate} className="form-row" style={{ marginTop: 10 }}>
                    <div className="field">
                        <label>Name</label>
                        <input className="input" placeholder="Acme Logistics" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label>Code</label>
                        <input className="input" style={{ fontFamily: 'var(--font-mono)' }} placeholder="ACME" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn--primary">Add client</button>
                </form>
            </div>

            {accounts.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">No clients yet</div>
                    <p>Add a client account above so drivers can log trips against it.</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>Code</th><th>Name</th><th>Status</th></tr></thead>
                        <tbody>
                            {accounts.map((a) => (
                                <tr key={a.id}>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{a.code}</td>
                                    <td>{a.name}</td>
                                    <td><span className={`pill ${a.is_active ? 'pill--confirmed' : 'pill--cancelled'}`}>{a.is_active ? 'Active' : 'Inactive'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
