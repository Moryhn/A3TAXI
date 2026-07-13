import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme.js';

const options = [
    {
        to: '/book',
        eyebrow: 'Customer',
        title: 'Book a ride',
        description: 'Request a pickup online — we\'ll confirm by text.',
    },
    {
        to: '/login?mode=driver',
        eyebrow: 'Driver',
        title: 'Driver login',
        description: 'Log a trip, view dispatched jobs, share your location.',
    },
    {
        to: '/login?mode=admin',
        eyebrow: 'Admin',
        title: 'Admin login',
        description: 'Dispatch, billing, reservations, and fleet management.',
    },
];

export default function Home() {
    const [theme, toggleTheme] = useTheme('a3taxi-home-theme', 'light');

    return (
        <div className={`theme-${theme}`} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
            <button
                onClick={toggleTheme}
                className="btn btn--ghost"
                style={{ position: 'absolute', top: 20, right: 20, padding: '8px 14px', fontSize: 12 }}
            >
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <div style={{ width: '100%', maxWidth: 720 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, justifyContent: 'center' }}>
                    <div className="rail__mark" style={{ width: 44, height: 44, fontSize: 20 }}>A3</div>
                    <div>
                        <div className="h1" style={{ fontSize: 24 }}>A3TAXI</div>
                        <div className="subtle" style={{ marginTop: -2 }}>Fleet dispatch console</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    {options.map((opt) => (
                        <Link
                            key={opt.to}
                            to={opt.to}
                            className="card"
                            style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s ease' }}
                        >
                            <div className="eyebrow">{opt.eyebrow}</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', margin: '6px 0 8px' }}>
                                {opt.title}
                            </div>
                            <p className="subtle" style={{ margin: 0, lineHeight: 1.5 }}>{opt.description}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
