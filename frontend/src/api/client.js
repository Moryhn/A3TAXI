const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token, isFormData = false } = {}) {
    const headers = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(data?.error || `Request failed with status ${res.status}`);
    }
    return data;
}

export const api = {
    adminLogin: (email, password) => request('/auth/admin/login', { method: 'POST', body: { email, password } }),
    driverLogin: (accessCode) => request('/auth/driver/login', { method: 'POST', body: { accessCode } }),

    listDrivers: (token) => request('/drivers', { token }),
    createDriver: (token, driver) => request('/drivers', { method: 'POST', body: driver, token }),

    listClientAccounts: (token) => request('/client-accounts', { token }),
    createClientAccount: (token, account) => request('/client-accounts', { method: 'POST', body: account, token }),

    listTrips: (token, params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/trips${qs ? `?${qs}` : ''}`, { token });
    },
    createTrip: (token, formData) => request('/trips', { method: 'POST', body: formData, token, isFormData: true }),

    generateInvoice: (token, body) => request('/invoices/generate', { method: 'POST', body, token }),
    listInvoices: (token, params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/invoices${qs ? `?${qs}` : ''}`, { token });
    },
    getInvoice: (token, id) => request(`/invoices/${id}`, { token }),

    getDriverPositions: (token) => request('/dispatch/positions', { token }),
    postDriverPosition: (token, lat, lng) => request('/dispatch/positions', { method: 'POST', body: { lat, lng }, token }),
    createDispatchJob: (token, body) => request('/dispatch/jobs', { method: 'POST', body, token }),
    listMyJobs: (token, status) => request(`/dispatch/jobs${status ? `?status=${status}` : ''}`, { token }),
    updateJobStatus: (token, id, status) => request(`/dispatch/jobs/${id}`, { method: 'PATCH', body: { status }, token }),

    createReservation: (body) => request('/reservations', { method: 'POST', body }),
    listReservations: (token, params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/reservations${qs ? `?${qs}` : ''}`, { token });
    },
    updateReservationStatus: (token, id, status) => request(`/reservations/${id}`, { method: 'PATCH', body: { status }, token }),
};
