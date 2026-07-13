import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import TripEntry from './driver/TripEntry.jsx';
import MyJobs from './driver/MyJobs.jsx';

export default function DriverDashboard() {
    const { auth, logout } = useAuth();
    const [theme, toggleTheme] = useTheme('a3taxi-driver-theme', 'light');
    const { t, lang, toggleLang } = useLanguage();

    return (
        <div className={`theme-${theme}`} style={{ minHeight: '100vh' }}>
            <div className="mobile-shell">
                <div className="mobile-topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="rail__mark" style={{ width: 32, height: 32, fontSize: 14 }}>A3</div>
                        <div>
                            <div className="eyebrow" style={{ margin: 0 }}>{t('nav.driverEyebrow')}</div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{auth.user.name}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={toggleTheme} className="btn btn--ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
                            {theme === 'dark' ? t('common.light') : t('common.dark')}
                        </button>
                        <button onClick={toggleLang} className="btn btn--ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
                            {lang === 'en' ? 'FR' : 'EN'}
                        </button>
                        <button onClick={logout} className="btn btn--ghost" style={{ padding: '8px 14px', fontSize: 12 }}>{t('common.logOut')}</button>
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
                    <NavLink to="trip-entry" className={({ isActive }) => `bottom-nav__link ${isActive ? 'bottom-nav__link--active' : ''}`}>{t('nav.newTrip')}</NavLink>
                    <NavLink to="jobs" className={({ isActive }) => `bottom-nav__link ${isActive ? 'bottom-nav__link--active' : ''}`}>{t('nav.myJobs')}</NavLink>
                </nav>
            </div>
        </div>
    );
}
