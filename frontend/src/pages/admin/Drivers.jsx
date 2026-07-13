import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

export default function Drivers() {
    const { auth } = useAuth();
    const [drivers, setDrivers] = useState([]);
    const [form, setForm] = useState({ name: '', phone: '' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', phone: '' });
    const [pendingDelete, setPendingDelete] = useState(null);

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

    function startEdit(d) {
        setEditingId(d.id);
        setEditForm({ name: d.name, phone: d.phone || '' });
    }

    async function saveEdit(id) {
        await api.updateDriver(auth.token, id, editForm);
        setEditingId(null);
        refresh();
    }

    async function confirmDelete() {
        await api.deleteDriver(auth.token, pendingDelete.id);
        setPendingDelete(null);
        refresh();
    }

    async function reactivate(d) {
        await api.updateDriver(auth.token, d.id, { isActive: true });
        refresh();
    }

    return (
        <div>
            <div className="page__head">
                <div>
                    <div className="eyebrow">Fleet</div>
                    <h1 className="h1">Drivers</h1>
                </div>
                <div className="meter meter--sm">{drivers.filter((d) => d.is_active).length}<span className="meter__unit">on roster</span></div>
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
                        <thead><tr><th>Name</th><th>Phone</th><th>Access code</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {drivers.map((d) => (
                                <tr key={d.id}>
                                    {editingId === d.id ? (
                                        <>
                                            <td><input className="input" style={{ padding: '6px 10px' }} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></td>
                                            <td><input className="input" style={{ padding: '6px 10px' }} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></td>
                                            <td><span className="meter meter--sm">{d.access_code}</span></td>
                                            <td><span className={`pill ${d.is_active ? 'pill--confirmed' : 'pill--cancelled'}`}>{d.is_active ? 'Active' : 'Inactive'}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => saveEdit(d.id)} className="btn btn--primary" style={{ padding: '6px 12px', fontSize: 12 }}>Save</button>
                                                    <button onClick={() => setEditingId(null)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Cancel</button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{d.name}</td>
                                            <td className="subtle">{d.phone || '—'}</td>
                                            <td><span className="meter meter--sm">{d.access_code}</span></td>
                                            <td><span className={`pill ${d.is_active ? 'pill--confirmed' : 'pill--cancelled'}`}>{d.is_active ? 'Active' : 'Inactive'}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => startEdit(d)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Edit</button>
                                                    {d.is_active ? (
                                                        <button onClick={() => setPendingDelete(d)} className="btn btn--danger" style={{ padding: '6px 12px', fontSize: 12 }}>Delete</button>
                                                    ) : (
                                                        <button onClick={() => reactivate(d)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Reactivate</button>
                                                    )}
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

            <ConfirmDialog
                open={!!pendingDelete}
                title={`Delete ${pendingDelete?.name}?`}
                message="This deactivates the driver and revokes their access code. Their trip history is kept, and you can reactivate them later."
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
