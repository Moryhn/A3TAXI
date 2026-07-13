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
        <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
            <h1>A3TAXI</h1>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setMode('admin')} disabled={mode === 'admin'}>Admin</button>
                <button onClick={() => setMode('driver')} disabled={mode === 'driver'}>Driver</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mode === 'admin' ? (
                    <>
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </>
                ) : (
                    <input placeholder="Access code" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} required />
                )}
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit">Log in</button>
            </form>
        </div>
    );
}
