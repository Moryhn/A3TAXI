import { useEffect, useState } from 'react';

export function useTheme(storageKey, defaultTheme) {
    const [theme, setTheme] = useState(() => localStorage.getItem(storageKey) || defaultTheme);

    useEffect(() => {
        localStorage.setItem(storageKey, theme);
    }, [storageKey, theme]);

    function toggleTheme() {
        setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
    }

    return [theme, toggleTheme];
}
