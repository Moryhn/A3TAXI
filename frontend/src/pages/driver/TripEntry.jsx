import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function TripEntry() {
    const { auth } = useAuth();
    const [clients, setClients] = useState([]);
    const [form, setForm] = useState({ clientAccountId: '', departureLocation: '', arrivalLocation: '', amount: '' });
    const [receipt, setReceipt] = useState(null);
    const [status, setStatus] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.listClientAccounts(auth.token).then(setClients);
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus(null);
        setSaving(true);
        const data = new FormData();
        Object.entries(form).forEach(([k, v]) => data.append(k, v));
        if (receipt) data.append('receipt', receipt);

        try {
            await api.createTrip(auth.token, data);
            setForm({ clientAccountId: '', departureLocation: '', arrivalLocation: '', amount: '' });
            setReceipt(null);
            setStatus({ ok: true, message: 'Trip saved.' });
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <div className="eyebrow">New entry</div>
            <h1 className="h1" style={{ fontSize: 26, marginBottom: 20 }}>Log a trip</h1>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field">
                    <label>Fare amount</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--ink)', borderRadius: 'var(--radius-md)', padding: '14px 16px', boxShadow: 'inset 0 0 0 1px rgba(245,183,0,0.25)' }}>
                        <span style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600 }}>$</span>
                        <input
                            className="input"
                            style={{ background: 'transparent', border: 'none', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, padding: 0 }}
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div className="field">
                    <label>Client account</label>
                    <select className="select" value={form.clientAccountId} onChange={(e) => setForm({ ...form, clientAccountId: e.target.value })} required>
                        <option value="">Select client account</option>
                        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="field">
                    <label>Departure</label>
                    <input className="input" placeholder="Where the trip started" value={form.departureLocation} onChange={(e) => setForm({ ...form, departureLocation: e.target.value })} required />
                </div>

                <div className="field">
                    <label>Arrival</label>
                    <input className="input" placeholder="Where the trip ended" value={form.arrivalLocation} onChange={(e) => setForm({ ...form, arrivalLocation: e.target.value })} required />
                </div>

                <div className="field">
                    <label>Receipt photo</label>
                    <input className="input" type="file" accept="image/*" capture="environment" onChange={(e) => setReceipt(e.target.files[0])} style={{ padding: 10 }} />
                </div>

                <button type="submit" className="btn btn--primary" style={{ padding: '15px 18px', fontSize: 16 }} disabled={saving}>
                    {saving ? 'Saving…' : 'Save trip'}
                </button>

                {status && (
                    <div
                        className="pill"
                        style={{
                            justifyContent: 'center',
                            padding: '10px 14px',
                            color: status.ok ? '#0f8a5f' : 'var(--danger)',
                            background: status.ok ? 'rgba(52,211,153,0.15)' : 'rgba(240,85,76,0.12)',
                        }}
                    >
                        {status.message}
                    </div>
                )}
            </form>
        </div>
    );
}
