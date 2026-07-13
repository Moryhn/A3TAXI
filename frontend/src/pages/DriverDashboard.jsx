import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import TripEntry from './driver/TripEntry.jsx';
import MyJobs from './driver/MyJobs.jsx';

export default function DriverDashboard() {
    const { auth, logout } = useAuth();

    return (
        <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h1>A3TAXI — {auth.user.name}</h1>
                <button onClick={logout}>Log out</button>
            </header>

            <nav style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #ddd', paddingBottom: 8 }}>
                <NavLink to="trip-entry">New Trip</NavLink>
                <NavLink to="jobs">My Jobs</NavLink>
            </nav>

            <Routes>
                <Route index element={<Navigate to="trip-entry" replace />} />
                <Route path="trip-entry" element={<TripEntry />} />
                <Route path="jobs" element={<MyJobs />} />
            </Routes>
        </div>
    );
}
