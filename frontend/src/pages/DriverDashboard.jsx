import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import TripEntry from './driver/TripEntry.jsx';
import MyJobs from './driver/MyJobs.jsx';

export default function DriverDashboard() {
    const { auth, logout } = useAuth();
    const [theme, toggleTheme] = useTheme('a3taxi-driver-theme', 'light');

    return (
        <div className={`theme-${theme} mobile-shell`}>
            <div className="mobile-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="rail__mark" style={{ width: 32, height: 32, fontSize: 14 }}>A3</div>
                    <div>
                        <div className="eyebrow" style={{ margin: 0 }}>Driver</div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{auth.user.name}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={toggleTheme} className="btn btn--ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
                        {theme === 'dark' ? 'Light' : 'Dark'}
                    </button>
                    <button onClick={logout} className="btn btn--ghost" style={{ padding: '8px 14px', fontSize: 12 }}>Log out</button>
                </div>
            </div>

            <div className="mobile-content">
                <Routes>
                    <Route index element={<Navigate to="trip-entry" replace />} />
                    <Route path="trip-entry" element={<TripEntry />} />
                    <Route path="jobs" element={<MyJobs />} />
                </Routes>
            </div>

            <nav className="bottom-nav">
                <NavLink to="trip-entry" className={({ isActive }) => `bottom-nav__link ${isActive ? 'bottom-nav__link--active' : ''}`}>New Trip</NavLink>
                <NavLink to="jobs" className={({ isActive }) => `bottom-nav__link ${isActive ? 'bottom-nav__link--active' : ''}`}>My Jobs</NavLink>
            </nav>
        </div>
    );
}
