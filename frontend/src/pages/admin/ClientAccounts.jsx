import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

export default function ClientAccounts() {
    const { auth } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [form, setForm] = useState({ name: '', code: '' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '' });
    const [pendingDelete, setPendingDelete] = useState(null);

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

    function startEdit(a) {
        setEditingId(a.id);
        setEditForm({ name: a.name });
    }

    async function saveEdit(id) {
        await api.updateClientAccount(auth.token, id, editForm);
        setEditingId(null);
        refresh();
    }

    async function confirmDelete() {
        await api.deleteClientAccount(auth.token, pendingDelete.id);
        setPendingDelete(null);
        refresh();
    }

    async function reactivate(a) {
        await api.updateClientAccount(auth.token, a.id, { isActive: true });
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
                        <thead><tr><th>Code</th><th>Name</th><th>Status</th><th></th></tr></thead>
                        <tbody>
                            {accounts.map((a) => (
                                <tr key={a.id}>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{a.code}</td>
                                    {editingId === a.id ? (
                                        <>
                                            <td><input className="input" style={{ padding: '6px 10px' }} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></td>
                                            <td><span className={`pill ${a.is_active ? 'pill--confirmed' : 'pill--cancelled'}`}>{a.is_active ? 'Active' : 'Inactive'}</span></td>
                                            <td style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={() => saveEdit(a.id)} className="btn btn--primary" style={{ padding: '6px 12px', fontSize: 12 }}>Save</button>
                                                <button onClick={() => setEditingId(null)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Cancel</button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{a.name}</td>
                                            <td><span className={`pill ${a.is_active ? 'pill--confirmed' : 'pill--cancelled'}`}>{a.is_active ? 'Active' : 'Inactive'}</span></td>
                                            <td style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={() => startEdit(a)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Edit</button>
                                                {a.is_active ? (
                                                    <button onClick={() => setPendingDelete(a)} className="btn btn--danger" style={{ padding: '6px 12px', fontSize: 12 }}>Delete</button>
                                                ) : (
                                                    <button onClick={() => reactivate(a)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Reactivate</button>
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                open={!!pendingDelete}
                title={`Delete ${pendingDelete?.name}?`}
                message="This deactivates the client account so drivers can no longer log trips against it. Past trips and invoices are kept, and you can reactivate it later."
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
