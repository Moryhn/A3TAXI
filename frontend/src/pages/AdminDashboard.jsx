import { useState } from 'react';
import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { api } from '../api/client.js';
import ClientAccounts from './admin/ClientAccounts.jsx';
import Drivers from './admin/Drivers.jsx';
import DriverDetail from './admin/DriverDetail.jsx';
import Trips from './admin/Trips.jsx';
import Invoices from './admin/Invoices.jsx';
import InvoicePrint from './admin/InvoicePrint.jsx';
import DispatchMap from './admin/DispatchMap.jsx';
import Reservations from './admin/Reservations.jsx';
import Trash from './admin/Trash.jsx';

export default function AdminDashboard() {
    const { auth, logout } = useAuth();
    const location = useLocation();
    const [theme, toggleTheme] = useTheme('a3taxi-admin-theme', 'dark');
    const { t, lang, toggleLang } = useLanguage();
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    const tabs = [
        { path: 'dispatch', label: t('nav.dispatch'), element: <DispatchMap /> },
        { path: 'trips', label: t('nav.trips'), element: <Trips /> },
        { path: 'invoices', label: t('nav.invoices'), element: <Invoices /> },
        { path: 'reservations', label: t('nav.reservations'), element: <Reservations /> },
        { path: 'clients', label: t('nav.clients'), element: <ClientAccounts /> },
        { path: 'drivers', label: t('nav.drivers'), element: <Drivers /> },
        { path: 'trash', label: t('nav.trash'), element: <Trash /> },
    ];

    async function handleExport() {
        setExporting(true);
        setExportError('');
        try {
            await api.exportExcel(auth.token);
        } catch (err) {
            setExportError(err.message);
        } finally {
            setExporting(false);
        }
    }

    if (location.pathname.endsWith('/print')) {
        return (
            <Routes>
                <Route path="invoices/:id/print" element={<InvoicePrint />} />
            </Routes>
        );
    }

    return (
        <div className={`theme-${theme} app-shell`}>
            <aside className="rail">
                <div className="rail__brand">
                    <div className="rail__mark">A3</div>
                    <div className="rail__name">A3TAXI</div>
                </div>

                <nav className="rail__nav">
                    {tabs.map((tab) => (
                        <NavLink
                            key={tab.path}
                            to={tab.path}
                            className={({ isActive }) => `rail__link ${isActive ? 'rail__link--active' : ''}`}
                        >
                            {tab.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="rail__foot">
                    <div className="subtle" style={{ marginBottom: 10 }}>{auth.user.name}</div>
                    <button onClick={handleExport} className="btn btn--ghost" style={{ width: '100%', marginBottom: 8 }} disabled={exporting}>
                        {exporting ? t('nav.exporting') : t('nav.exportData')}
                    </button>
                    {exportError && (
                        <div className="pill" style={{ marginBottom: 8, color: 'var(--danger)', background: 'rgba(240,85,76,0.12)', width: '100%' }}>
                            {exportError}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <button onClick={toggleTheme} className="btn btn--ghost" style={{ flex: 1 }}>
                            {theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
                        </button>
                        <button onClick={toggleLang} className="btn btn--ghost" style={{ flex: 1 }}>
                            {lang === 'en' ? 'FR' : 'EN'}
                        </button>
                    </div>
                    <button onClick={logout} className="btn btn--ghost" style={{ width: '100%' }}>{t('common.logOut')}</button>
                </div>
            </aside>

            <nav className="admin-bottom-nav">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        className={({ isActive }) => `rail__link ${isActive ? 'rail__link--active' : ''}`}
                    >
                        {tab.label}
                    </NavLink>
                ))}
            </nav>

            <Routes>
                <Route index element={<Navigate to="dispatch" replace />} />
                {tabs.map((tab) => (
                    <Route key={tab.path} path={tab.path} element={<div className="page">{tab.element}</div>} />
                ))}
                <Route path="invoices/:id/print" element={<InvoicePrint />} />
                <Route path="drivers/:id" element={<div className="page"><DriverDetail /></div>} />
            </Routes>
        </div>
    );
}
