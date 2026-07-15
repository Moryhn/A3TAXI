import { Link } from 'react-router-dom';
import { ArrowRight, Phone, ShieldCheck, Globe2, MessageCircle } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function Home() {
    const [theme, toggleTheme] = useTheme('a3taxi-home-theme', 'light');
    const { t, lang, toggleLang } = useLanguage();

    return (
        <div className={`theme-${theme} storefront`}>
            <div className="storefront__topbar">
                <div className="storefront__brand">
                    <div className="rail__mark">A3</div>
                    <div className="eyebrow" style={{ margin: 0 }}>A3TAXI</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={toggleTheme} className="btn btn--ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
                        {theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
                    </button>
                    <button onClick={toggleLang} className="btn btn--ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
                        {lang === 'en' ? 'FR' : 'EN'}
                    </button>
                </div>
            </div>

            <div className="storefront__main">
                <div className="hero">
                    <div className="eyebrow">{t('home.heroEyebrow')}</div>
                    <h1 className="hero__title">
                        {t('home.heroTitleStart')} <em>{t('home.heroTitleEmphasis')}</em>
                    </h1>
                    <p className="hero__subtitle">{t('home.heroSubtitle')}</p>
                    <div className="hero__cta-row">
                        <Link to="/book-now" className="btn btn--primary hero__cta">
                            {t('home.titleBookNow')}
                            <ArrowRight size={18} />
                        </Link>
                        <Link to="/book" className="btn btn--ghost hero__cta">
                            {t('home.titleBook')}
                        </Link>
                        <a href="tel:+14504442000" className="btn btn--ghost hero__cta">
                            <Phone size={16} />
                            {t('home.titleCallNow')}
                        </a>
                    </div>

                    <div className="trust-strip">
                        <span className="trust-badge"><ShieldCheck size={15} /> {t('home.trustNoSurge')}</span>
                        <span className="trust-badge"><Globe2 size={15} /> {t('home.trustArea')}</span>
                        <span className="trust-badge"><MessageCircle size={15} /> {t('home.trustSms')}</span>
                    </div>
                </div>

                <div className="staff-links">
                    <Link to="/login?mode=driver" className="staff-link">{t('home.titleDriverLogin')}</Link>
                    <Link to="/login?mode=admin" className="staff-link">{t('home.titleAdminLogin')}</Link>
                </div>
            </div>
        </div>
    );
}
