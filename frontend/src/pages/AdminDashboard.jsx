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
    { path: 'clients', label: 'Clients', element: <ClientAccounts /> },
    { path: 'drivers', label: 'Drivers', element: <Drivers /> },
    { path: 'trips', label: 'Trips', element: <Trips /> },
    { path: 'invoices', label: 'Invoices', element: <Invoices /> },
    { path: 'dispatch', label: 'Dispatch', element: <DispatchMap /> },
    { path: 'reservations', label: 'Reservations', element: <Reservations /> },
];

export default function AdminDashboard() {
    const { auth, logout } = useAuth();

    return (
        <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h1>A3TAXI Admin — {auth.user.name}</h1>
                <button onClick={logout}>Log out</button>
            </header>

            <nav style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #ddd', paddingBottom: 8 }}>
                {tabs.map((t) => (
                    <NavLink key={t.path} to={t.path}>{t.label}</NavLink>
                ))}
            </nav>

            <Routes>
                <Route index element={<Navigate to="clients" replace />} />
                {tabs.map((t) => (
                    <Route key={t.path} path={t.path} element={t.element} />
                ))}
                <Route path="invoices/:id/print" element={<InvoicePrint />} />
            </Routes>
        </div>
    );
}
