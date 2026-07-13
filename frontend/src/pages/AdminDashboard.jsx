import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ClientAccounts from './admin/ClientAccounts.jsx';
import Drivers from './admin/Drivers.jsx';
import Trips from './admin/Trips.jsx';
import Invoices from './admin/Invoices.jsx';
import InvoicePrint from './admin/InvoicePrint.jsx';
import DispatchMap from './admin/DispatchMap.jsx';
import Reservations from './admin/Reservations.jsx';

const tabs = [
    { path: 'dispatch', label: 'Dispatch', element: <DispatchMap /> },
    { path: 'trips', label: 'Trips', element: <Trips /> },
    { path: 'invoices', label: 'Invoices', element: <Invoices /> },
    { path: 'reservations', label: 'Reservations', element: <Reservations /> },
    { path: 'clients', label: 'Clients', element: <ClientAccounts /> },
    { path: 'drivers', label: 'Drivers', element: <Drivers /> },
];

export default function AdminDashboard() {
    const { auth, logout } = useAuth();

    return (
        <div className="theme-dark app-shell">
            <aside className="rail">
                <div className="rail__brand">
                    <div className="rail__mark">A3</div>
                    <div className="rail__name">A3TAXI</div>
                </div>

                <nav className="rail__nav">
                    {tabs.map((t) => (
                        <NavLink
                            key={t.path}
                            to={t.path}
                            className={({ isActive }) => `rail__link ${isActive ? 'rail__link--active' : ''}`}
                        >
                            {t.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="rail__foot">
                    <div className="subtle" style={{ marginBottom: 10 }}>{auth.user.name}</div>
                    <button onClick={logout} className="btn btn--ghost" style={{ width: '100%' }}>Log out</button>
                </div>
            </aside>

            <Routes>
                <Route index element={<Navigate to="dispatch" replace />} />
                {tabs.map((t) => (
                    <Route key={t.path} path={t.path} element={<div className="page">{t.element}</div>} />
                ))}
                <Route path="invoices/:id/print" element={<InvoicePrint />} />
            </Routes>
        </div>
    );
}
