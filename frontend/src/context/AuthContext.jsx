import { createContext, useContext, useEffect, useMemo, useCallback, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [auth, setAuth] = useState(() => {
        const stored = localStorage.getItem('a3taxi_auth');
        return stored ? JSON.parse(stored) : null;
    });

    useEffect(() => {
        if (auth) localStorage.setItem('a3taxi_auth', JSON.stringify(auth));
        else localStorage.removeItem('a3taxi_auth');
    }, [auth]);

    const login = useCallback((token, user) => setAuth({ token, user }), []);
    const logout = useCallback(() => setAuth(null), []);
    const value = useMemo(() => ({ auth, login, logout }), [auth, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
