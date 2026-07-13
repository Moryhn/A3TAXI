import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useTheme } from '../../hooks/useTheme.js';

export default function ReservationForm() {
    const [theme, toggleTheme] = useTheme('a3taxi-home-theme', 'light');
    const [form, setForm] = useState({
        clientName: '', clientPhone: '', clientEmail: '',
        pickupLocation: '', dropoffLocation: '', requestedTime: '',
    });
    const [status, setStatus] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus(null);
        try {
            await api.createReservation(form);
            setStatus({ ok: true, message: 'Request received. You\'ll get an SMS confirmation shortly.' });
            setForm({ clientName: '', clientPhone: '', clientEmail: '', pickupLocation: '', dropoffLocation: '', requestedTime: '' });
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        }
    }

    return (
        <div className={`theme-${theme}`} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
            <button
                onClick={toggleTheme}
                className="btn btn--ghost"
                style={{ position: 'absolute', top: 20, right: 20, padding: '8px 14px', fontSize: 12 }}
            >
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <div style={{ width: '100%', maxWidth: 440 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div className="rail__mark" style={{ width: 40, height: 40, fontSize: 18 }}>A3</div>
                    <div className="eyebrow" style={{ margin: 0 }}>A3TAXI</div>
                </div>
                <h1 className="h1" style={{ fontSize: 32, marginBottom: 4 }}>Book a ride</h1>
                <p className="subtle" style={{ marginBottom: 24 }}>Tell us where and when — we'll confirm by text.</p>

                <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="field">
                        <label htmlFor="clientName">Your name</label>
                        <input id="clientName" name="name" className="input" autoComplete="name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label htmlFor="clientPhone">Phone number</label>
                        <input id="clientPhone" name="tel" className="input" type="tel" autoComplete="tel" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label htmlFor="clientEmail">Email (optional)</label>
                        <input id="clientEmail" name="email" className="input" type="email" autoComplete="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} />
                    </div>
                    <div className="field">
                        <label htmlFor="pickup">Pickup location</label>
                        <input id="pickup" className="input" value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label htmlFor="dropoff">Drop-off location</label>
                        <input id="dropoff" className="input" value={form.dropoffLocation} onChange={(e) => setForm({ ...form, dropoffLocation: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label htmlFor="requestedTime">Pickup date &amp; time</label>
                        <input id="requestedTime" className="input" type="datetime-local" value={form.requestedTime} onChange={(e) => setForm({ ...form, requestedTime: e.target.value })} required />
                    </div>

                    <button type="submit" className="btn btn--primary" style={{ marginTop: 8, padding: '14px 18px', fontSize: 15 }}>
                        Request booking
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
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Link to="/" className="subtle" style={{ textDecoration: 'none' }}>← Back to home</Link>
                </div>
            </div>
        </div>
    );
}
