import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

export default function ClientAccounts() {
    const { auth } = useAuth();
    const { t } = useLanguage();
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

    return (
        <div>
            <div className="page__head">
                <div>
                    <div className="eyebrow">{t('admin.clients.eyebrow')}</div>
                    <h1 className="h1">{t('admin.clients.title')}</h1>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="eyebrow">{t('admin.clients.addEyebrow')}</div>
                <form onSubmit={handleCreate} className="form-row" style={{ marginTop: 10 }}>
                    <div className="field">
                        <label>{t('admin.clients.nameLabel')}</label>
                        <input className="input" placeholder="Acme Logistics" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label>{t('admin.clients.codeLabel')}</label>
                        <input className="input" style={{ fontFamily: 'var(--font-mono)' }} placeholder="ACME" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn--primary">{t('admin.clients.addClientBtn')}</button>
                </form>
            </div>

            {accounts.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">{t('admin.clients.emptyTitle')}</div>
                    <p>{t('admin.clients.emptyBody')}</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>{t('admin.clients.colCode')}</th><th>{t('admin.clients.colName')}</th><th>{t('admin.clients.colActions')}</th></tr></thead>
                        <tbody>
                            {accounts.map((a) => (
                                <tr key={a.id}>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{a.code}</td>
                                    {editingId === a.id ? (
                                        <>
                                            <td><input className="input" style={{ padding: '6px 10px' }} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => saveEdit(a.id)} className="btn btn--primary" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.save')}</button>
                                                    <button onClick={() => setEditingId(null)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.cancel')}</button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{a.name}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => startEdit(a)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.edit')}</button>
                                                    <button onClick={() => setPendingDelete(a)} className="btn btn--danger" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.delete')}</button>
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
                title={t('admin.clients.confirmDeleteTitle', { name: pendingDelete?.name })}
                message={t('admin.clients.confirmDeleteMessage')}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
