import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

export default function Drivers() {
    const { auth } = useAuth();
    const { t } = useLanguage();
    const [drivers, setDrivers] = useState([]);
    const [form, setForm] = useState({ name: '', phone: '' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', phone: '', accessCode: '' });
    const [pendingDelete, setPendingDelete] = useState(null);
    const [pendingReset, setPendingReset] = useState(null);
    const [error, setError] = useState('');

    async function refresh() {
        try {
            setDrivers(await api.listDrivers(auth.token));
            setError('');
        } catch (err) {
            setError(err.message);
        }
    }

    useEffect(() => { refresh(); }, []);

    async function handleCreate(e) {
        e.preventDefault();
        try {
            await api.createDriver(auth.token, form);
            setForm({ name: '', phone: '' });
            setError('');
            refresh();
        } catch (err) {
            setError(err.message);
        }
    }

    function startEdit(d) {
        setEditingId(d.id);
        setEditForm({ name: d.name, phone: d.phone || '', accessCode: d.access_code });
        setError('');
    }

    async function saveEdit(id) {
        try {
            await api.updateDriver(auth.token, id, editForm);
            setEditingId(null);
            setError('');
            refresh();
        } catch (err) {
            setError(err.message);
        }
    }

    async function confirmDelete() {
        await api.deleteDriver(auth.token, pendingDelete.id);
        setPendingDelete(null);
        refresh();
    }

    async function confirmReset() {
        await api.resetDriverAccessCode(auth.token, pendingReset.id);
        setPendingReset(null);
        refresh();
    }

    return (
        <div>
            <div className="page__head">
                <div>
                    <div className="eyebrow">{t('admin.drivers.eyebrow')}</div>
                    <h1 className="h1">{t('admin.drivers.title')}</h1>
                </div>
                <div className="meter meter--sm">{drivers.length}<span className="meter__unit">{t('admin.drivers.onRoster')}</span></div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="eyebrow">{t('admin.drivers.addEyebrow')}</div>
                <form onSubmit={handleCreate} className="form-row" style={{ marginTop: 10 }}>
                    <div className="field">
                        <label>{t('admin.drivers.nameLabel')}</label>
                        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label>{t('admin.drivers.phoneLabel')}</label>
                        <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn--primary">{t('admin.drivers.addDriverBtn')}</button>
                </form>
                <p className="subtle" style={{ marginTop: 10 }}>{t('admin.drivers.helperText')}</p>
            </div>

            {error && <div className="pill pill--cancelled" style={{ color: 'var(--danger)', background: 'rgba(240,85,76,0.12)', marginBottom: 16 }}>{error}</div>}

            {drivers.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">{t('admin.drivers.emptyTitle')}</div>
                    <p>{t('admin.drivers.emptyBody')}</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>{t('admin.drivers.colName')}</th><th>{t('admin.drivers.colPhone')}</th><th>{t('admin.drivers.colAccessCode')}</th><th>{t('admin.drivers.colActions')}</th></tr></thead>
                        <tbody>
                            {drivers.map((d) => (
                                <tr key={d.id}>
                                    {editingId === d.id ? (
                                        <>
                                            <td><input className="input" style={{ padding: '6px 10px' }} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></td>
                                            <td><input className="input" style={{ padding: '6px 10px' }} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></td>
                                            <td>
                                                <input
                                                    className="input"
                                                    style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                                                    value={editForm.accessCode}
                                                    onChange={(e) => setEditForm({ ...editForm, accessCode: e.target.value })}
                                                    autoCapitalize="characters"
                                                    autoCorrect="off"
                                                    spellCheck="false"
                                                />
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => saveEdit(d.id)} className="btn btn--primary" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.save')}</button>
                                                    <button onClick={() => setEditingId(null)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.cancel')}</button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{d.name}</td>
                                            <td className="subtle">{d.phone || '—'}</td>
                                            <td><span className="meter meter--sm">{d.access_code}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    <Link to={`${d.id}`} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('admin.drivers.viewFile')}</Link>
                                                    <button onClick={() => startEdit(d)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.edit')}</button>
                                                    <button onClick={() => setPendingReset(d)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('admin.drivers.resetCodeBtn')}</button>
                                                    <button onClick={() => setPendingDelete(d)} className="btn btn--danger" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.delete')}</button>
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
                title={t('admin.drivers.confirmDeleteTitle', { name: pendingDelete?.name })}
                message={t('admin.drivers.confirmDeleteMessage')}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />

            <ConfirmDialog
                open={!!pendingReset}
                title={t('admin.drivers.confirmResetTitle', { name: pendingReset?.name })}
                message={t('admin.drivers.confirmResetMessage')}
                onConfirm={confirmReset}
                onCancel={() => setPendingReset(null)}
            />
        </div>
    );
}
