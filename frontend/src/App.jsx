import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import DriverDashboard from './pages/DriverDashboard.jsx';
import ReservationForm from './pages/public/ReservationForm.jsx';

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/book" replace />} />
                    <Route path="/book" element={<ReservationForm />} />
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/admin/*"
                        element={
                            <ProtectedRoute role="admin">
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/driver/*"
                        element={
                            <ProtectedRoute role="driver">
                                <DriverDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
