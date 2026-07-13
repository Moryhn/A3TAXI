import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function Home() {
    const [theme, toggleTheme] = useTheme('a3taxi-home-theme', 'light');
    const { t, lang, toggleLang } = useLanguage();

    const options = [
        {
            to: '/book',
            eyebrow: t('home.eyebrowCustomer'),
            title: t('home.titleBook'),
            description: t('home.descBook'),
        },
        {
            to: '/login?mode=driver',
            eyebrow: t('home.eyebrowDriver'),
            title: t('home.titleDriverLogin'),
            description: t('home.descDriverLogin'),
        },
        {
            to: '/login?mode=admin',
            eyebrow: t('home.eyebrowAdmin'),
            title: t('home.titleAdminLogin'),
            description: t('home.descAdminLogin'),
        },
    ];

    return (
        <div className={`theme-${theme}`} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8 }}>
                <button
                    onClick={toggleTheme}
                    className="btn btn--ghost"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                >
                    {theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
                </button>
                <button
                    onClick={toggleLang}
                    className="btn btn--ghost"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                >
                    {lang === 'en' ? 'FR' : 'EN'}
                </button>
            </div>
            <div style={{ width: '100%', maxWidth: 720 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, justifyContent: 'center' }}>
                    <div className="rail__mark" style={{ width: 44, height: 44, fontSize: 20 }}>A3</div>
                    <div>
                        <div className="h1" style={{ fontSize: 24 }}>A3TAXI</div>
                        <div className="subtle" style={{ marginTop: -2 }}>{t('home.tagline')}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    {options.map((opt) => (
                        <Link
                            key={opt.to}
                            to={opt.to}
                            className="card"
                            style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s ease' }}
                        >
                            <div className="eyebrow">{opt.eyebrow}</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', margin: '6px 0 8px' }}>
                                {opt.title}
                            </div>
                            <p className="subtle" style={{ margin: 0, lineHeight: 1.5 }}>{opt.description}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
