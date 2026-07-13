import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatDateTime } from '../../lib/format.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

export default function Trash() {
    const { auth } = useAuth();
    const { t, lang } = useLanguage();
    const typeLabels = {
        trip: t('admin.trash.types.trip'),
        reservation: t('admin.trash.types.reservation'),
        job: t('admin.trash.types.job'),
        driver: t('admin.trash.types.driver'),
        client: t('admin.trash.types.client'),
    };
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');
    const [pendingDelete, setPendingDelete] = useState(null);

    async function refresh() {
        setItems(await api.listTrash(auth.token));
    }

    useEffect(() => { refresh(); }, []);

    async function restore(item) {
        setError('');
        try {
            await api.restoreTrashItem(auth.token, item.type, item.id);
            refresh();
        } catch (err) {
            setError(err.message);
        }
    }

    async function confirmPermanentDelete() {
        setError('');
        try {
            await api.permanentlyDeleteTrashItem(auth.token, pendingDelete.type, pendingDelete.id);
            setPendingDelete(null);
            refresh();
        } catch (err) {
            setError(err.message);
            setPendingDelete(null);
        }
    }

    return (
        <div>
            <div className="page__head">
                <div>
                    <div className="eyebrow">{t('admin.trash.eyebrow')}</div>
                    <h1 className="h1">{t('admin.trash.title')}</h1>
                </div>
                <div className="meter meter--sm">{items.length}<span className="meter__unit">{t('admin.trash.deleted')}</span></div>
            </div>

            <p className="subtle" style={{ marginBottom: 16 }}>
                {t('admin.trash.explain')}
            </p>

            {error && <div className="pill" style={{ marginBottom: 12, color: 'var(--danger)', background: 'rgba(240,85,76,0.12)' }}>{error}</div>}

            {items.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">{t('admin.trash.emptyTitle')}</div>
                    <p>{t('admin.trash.emptyBody')}</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>{t('admin.trash.colType')}</th><th>{t('admin.trash.colItem')}</th><th>{t('admin.trash.colDeleted')}</th><th>{t('admin.trash.colActions')}</th></tr></thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={`${item.type}-${item.id}`}>
                                    <td><span className="pill">{typeLabels[item.type] || item.type}</span></td>
                                    <td>
                                        <div>{item.label}</div>
                                        <div className="subtle" style={{ fontSize: 13 }}>{item.sublabel}</div>
                                    </td>
                                    <td className="subtle">{formatDateTime(item.deletedAt, lang)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => restore(item)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('admin.trash.restore')}</button>
                                            <button onClick={() => setPendingDelete(item)} className="btn btn--danger" style={{ padding: '6px 12px', fontSize: 12 }}>{t('admin.trash.deleteForever')}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                open={!!pendingDelete}
                title={t('admin.trash.confirmDeleteTitle', { type: (typeLabels[pendingDelete?.type] || pendingDelete?.type || '').toLowerCase() })}
                message={pendingDelete ? t('admin.trash.confirmDeleteMessage', { label: pendingDelete.label }) : ''}
                confirmLabel={t('admin.trash.deleteForever')}
                onConfirm={confirmPermanentDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
