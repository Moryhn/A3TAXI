import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function TripEntry() {
    const { auth } = useAuth();
    const [clients, setClients] = useState([]);
    const [form, setForm] = useState({ clientAccountId: '', departureLocation: '', arrivalLocation: '', amount: '' });
    const [receipt, setReceipt] = useState(null);
    const [status, setStatus] = useState('');

    useEffect(() => {
        api.listClientAccounts(auth.token).then(setClients);
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus('');
        const data = new FormData();
        Object.entries(form).forEach(([k, v]) => data.append(k, v));
        if (receipt) data.append('receipt', receipt);

        try {
            await api.createTrip(auth.token, data);
            setForm({ clientAccountId: '', departureLocation: '', arrivalLocation: '', amount: '' });
            setReceipt(null);
            setStatus('Trip saved.');
        } catch (err) {
            setStatus(`Error: ${err.message}`);
        }
    }

    return (
        <div>
            <h2>New Trip</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
                <select value={form.clientAccountId} onChange={(e) => setForm({ ...form, clientAccountId: e.target.value })} required>
                    <option value="">Select client account</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input placeholder="Departure location" value={form.departureLocation} onChange={(e) => setForm({ ...form, departureLocation: e.target.value })} required />
                <input placeholder="Arrival location" value={form.arrivalLocation} onChange={(e) => setForm({ ...form, arrivalLocation: e.target.value })} required />
                <input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                <input type="file" accept="image/*" capture="environment" onChange={(e) => setReceipt(e.target.files[0])} />
                <button type="submit">Save trip</button>
                {status && <p>{status}</p>}
            </form>
        </div>
    );
}
