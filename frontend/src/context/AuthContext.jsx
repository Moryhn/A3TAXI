import { createContext, useContext, useEffect, useState } from 'react';

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

    const login = (token, user) => setAuth({ token, user });
    const logout = () => setAuth(null);

    return (
        <AuthContext.Provider value={{ auth, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
