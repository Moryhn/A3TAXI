import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Invoices() {
    const { auth } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [clients, setClients] = useState([]);
    const [form, setForm] = useState({ clientAccountId: '', periodStart: '', periodEnd: '' });
    const [error, setError] = useState('');

    async function refresh() {
        setInvoices(await api.listInvoices(auth.token));
        setClients(await api.listClientAccounts(auth.token));
    }

    useEffect(() => { refresh(); }, []);

    async function handleGenerate(e) {
        e.preventDefault();
        setError('');
        try {
            await api.generateInvoice(auth.token, form);
            refresh();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div>
            <div className="page__head">
                <div>
                    <div className="eyebrow">Billing</div>
                    <h1 className="h1">Invoices</h1>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="eyebrow">Generate invoice</div>
                <form onSubmit={handleGenerate} className="form-row" style={{ marginTop: 10 }}>
                    <div className="field" style={{ minWidth: 180 }}>
                        <label>Client</label>
                        <select className="select" value={form.clientAccountId} onChange={(e) => setForm({ ...form, clientAccountId: e.target.value })} required>
                            <option value="">Select client</option>
                            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label>Period start</label>
                        <input className="input" type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label>Period end</label>
                        <input className="input" type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn--primary">Generate</button>
                </form>
                {error && <div className="pill" style={{ marginTop: 12, color: 'var(--danger)', background: 'rgba(240,85,76,0.12)' }}>{error}</div>}
            </div>

            {invoices.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">No invoices yet</div>
                    <p>Generate one above once trips are logged for a client.</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>Client</th><th>Period</th><th>Total</th><th>Generated</th><th></th></tr></thead>
                        <tbody>
                            {invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td>{inv.client_name}</td>
                                    <td className="subtle">{new Date(inv.period_start).toLocaleDateString()} → {new Date(inv.period_end).toLocaleDateString()}</td>
                                    <td><span className="meter meter--sm">${Number(inv.total_amount).toFixed(2)}</span></td>
                                    <td className="subtle">{new Date(inv.generated_at).toLocaleDateString()}</td>
                                    <td><Link to={`${inv.id}/print`} style={{ color: 'var(--amber)' }}>View / Print</Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="subtle" style={{ marginTop: 12 }}>Receipt photos are never included on the printed invoice — they remain in the system for internal verification only.</p>
        </div>
    );
}
