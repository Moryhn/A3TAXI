import { createContext, useContext, useEffect, useMemo, useCallback, useState } from 'react';
import en from './translations/en.js';
import fr from './translations/fr.js';
import { translate } from './t.js';

const dictionaries = { en, fr };
const STORAGE_KEY = 'a3taxi-lang';
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(() => localStorage.getItem(STORAGE_KEY) || 'en');

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, lang);
    }, [lang]);

    const toggleLang = useCallback(() => {
        setLang((l) => (l === 'en' ? 'fr' : 'en'));
    }, []);

    const t = useCallback((key, params) => translate(dictionaries[lang], key, params), [lang]);

    const value = useMemo(() => ({ lang, toggleLang, t }), [lang, toggleLang, t]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    return useContext(LanguageContext);
}
