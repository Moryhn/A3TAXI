import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
    const [mode, setMode] = useState('admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            if (mode === 'admin') {
                const { token, user } = await api.adminLogin(email, password);
                login(token, user);
                navigate('/admin');
            } else {
                const { token, user } = await api.driverLogin(accessCode);
                login(token, user);
                navigate('/driver');
            }
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div className="theme-light" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 380 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, justifyContent: 'center' }}>
                    <div className="rail__mark" style={{ width: 44, height: 44, fontSize: 20 }}>A3</div>
                    <div>
                        <div className="h1" style={{ fontSize: 24 }}>A3TAXI</div>
                        <div className="subtle" style={{ marginTop: -2 }}>Fleet dispatch console</div>
                    </div>
                </div>

                <div className="card">
                    <div className="tabbar" style={{ width: '100%', marginBottom: 20 }}>
                        <button
                            type="button"
                            className={`tabbar__btn ${mode === 'admin' ? 'tabbar__btn--active' : ''}`}
                            style={{ flex: 1 }}
                            onClick={() => setMode('admin')}
                        >
                            Admin
                        </button>
                        <button
                            type="button"
                            className={`tabbar__btn ${mode === 'driver' ? 'tabbar__btn--active' : ''}`}
                            style={{ flex: 1 }}
                            onClick={() => setMode('driver')}
                        >
                            Driver
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {mode === 'admin' ? (
                            <>
                                <div className="field">
                                    <label htmlFor="email">Email</label>
                                    <input id="email" className="input" type="email" placeholder="you@a3taxi.local" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                                <div className="field">
                                    <label htmlFor="password">Password</label>
                                    <input id="password" className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                </div>
                            </>
                        ) : (
                            <div className="field">
                                <label htmlFor="accessCode">Access code</label>
                                <input id="accessCode" className="input" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }} placeholder="DRV-1001" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} required />
                            </div>
                        )}
                        {error && <div className="pill pill--cancelled" style={{ color: 'var(--danger)', background: 'rgba(240,85,76,0.12)' }}>{error}</div>}
                        <button type="submit" className="btn btn--primary" style={{ marginTop: 6 }}>Log in</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
