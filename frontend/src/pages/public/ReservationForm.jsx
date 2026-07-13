import { useState } from 'react';
import { api } from '../../api/client.js';

export default function ReservationForm() {
    const [form, setForm] = useState({
        clientName: '', clientPhone: '', clientEmail: '',
        pickupLocation: '', dropoffLocation: '', requestedTime: '',
    });
    const [status, setStatus] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus('');
        try {
            await api.createReservation(form);
            setStatus('Reservation received! You will receive an SMS confirmation shortly.');
            setForm({ clientName: '', clientPhone: '', clientEmail: '', pickupLocation: '', dropoffLocation: '', requestedTime: '' });
        } catch (err) {
            setStatus(`Error: ${err.message}`);
        }
    }

    return (
        <div style={{ maxWidth: 420, margin: '40px auto', fontFamily: 'sans-serif' }}>
            <h1>Book a Ride — A3TAXI</h1>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input placeholder="Your name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required />
                <input placeholder="Phone number" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} required />
                <input type="email" placeholder="Email (optional)" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} />
                <input placeholder="Pickup location" value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} required />
                <input placeholder="Drop-off location" value={form.dropoffLocation} onChange={(e) => setForm({ ...form, dropoffLocation: e.target.value })} required />
                <label>
                    Pickup date/time
                    <input type="datetime-local" value={form.requestedTime} onChange={(e) => setForm({ ...form, requestedTime: e.target.value })} required />
                </label>
                <button type="submit">Request booking</button>
                {status && <p>{status}</p>}
            </form>
        </div>
    );
}
