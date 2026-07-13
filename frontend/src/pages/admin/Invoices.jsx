import { useEffect, useState } from 'react';
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
            <h2>Invoices</h2>
            <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={form.clientAccountId} onChange={(e) => setForm({ ...form, clientAccountId: e.target.value })} required>
                    <option value="">Select client</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} required />
                <input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} required />
                <button type="submit">Generate invoice</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <table>
                <thead><tr><th>Client</th><th>Period</th><th>Total</th><th>Generated</th></tr></thead>
                <tbody>
                    {invoices.map((inv) => (
                        <tr key={inv.id}>
                            <td>{inv.client_name}</td>
                            <td>{inv.period_start} → {inv.period_end}</td>
                            <td>${Number(inv.total_amount).toFixed(2)}</td>
                            <td>{new Date(inv.generated_at).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p style={{ color: '#666', fontSize: 14 }}>Open an invoice's print view (future work) to print/send. Receipt photos are never included on the printed invoice.</p>
        </div>
    );
}
