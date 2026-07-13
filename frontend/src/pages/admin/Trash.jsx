import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

const typeLabels = {
    trip: 'Trip',
    reservation: 'Reservation',
    job: 'Dispatch job',
    driver: 'Driver',
    client: 'Client account',
};

export default function Trash() {
    const { auth } = useAuth();
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
                    <div className="eyebrow">Fleet</div>
                    <h1 className="h1">Trash</h1>
                </div>
                <div className="meter meter--sm">{items.length}<span className="meter__unit">deleted</span></div>
            </div>

            <p className="subtle" style={{ marginBottom: 16 }}>
                Deleted trips, reservations, dispatch jobs, drivers, and client accounts land here. Restore them, or delete them permanently — that can't be undone.
            </p>

            {error && <div className="pill" style={{ marginBottom: 12, color: 'var(--danger)', background: 'rgba(240,85,76,0.12)' }}>{error}</div>}

            {items.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">Trash is empty</div>
                    <p>Anything you delete elsewhere in the app shows up here first.</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>Type</th><th>Item</th><th>Deleted</th><th>Actions</th></tr></thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={`${item.type}-${item.id}`}>
                                    <td><span className="pill">{typeLabels[item.type] || item.type}</span></td>
                                    <td>
                                        <div>{item.label}</div>
                                        <div className="subtle" style={{ fontSize: 13 }}>{item.sublabel}</div>
                                    </td>
                                    <td className="subtle">{new Date(item.deletedAt).toLocaleString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => restore(item)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Restore</button>
                                            <button onClick={() => setPendingDelete(item)} className="btn btn--danger" style={{ padding: '6px 12px', fontSize: 12 }}>Delete forever</button>
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
                title={`Permanently delete this ${typeLabels[pendingDelete?.type]?.toLowerCase() || 'item'}?`}
                message={pendingDelete ? `${pendingDelete.label}. This removes it completely and cannot be undone.` : ''}
                confirmLabel="Delete forever"
                onConfirm={confirmPermanentDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
