import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import GoogleMapView from '../../components/GoogleMapView.jsx';

// Public page reached via the SMS link sent when a driver accepts a job —
// no login, looked up by an unguessable token (see backend GET /dispatch/track/:token).
export default function TrackRide() {
    const { token } = useParams();
    const [theme, toggleTheme] = useTheme('a3taxi-home-theme', 'light');
    const { t, lang, toggleLang } = useLanguage();
    const [data, setData] = useState(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function refresh() {
            try {
                const d = await api.trackRide(token);
                if (!cancelled) { setData(d); setNotFound(false); }
            } catch {
                if (!cancelled) setNotFound(true);
            }
        }
        refresh();
        const interval = setInterval(refresh, 10000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [token]);

    const positions = data?.position
        ? [{
            driver_id: data.position.driver_id,
            driver_name: data.driverName,
            lat: data.position.lat,
            lng: data.position.lng,
            recorded_at: data.position.recorded_at,
        }]
        : [];

    return (
        <div className={`theme-${theme} storefront`}>
            <div className="storefront__topbar">
                <Link to="/" className="storefront__brand">
                    <div className="rail__mark">A3</div>
                    <div className="eyebrow" style={{ margin: 0 }}>A3TAXI</div>
                </Link>
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
                <div style={{ maxWidth: 700, margin: '0 auto', paddingBottom: 20 }}>
                    <h1 className="h1" style={{ fontSize: 26, marginBottom: 8 }}>{t('track.title')}</h1>

                    {notFound && (
                        <div className="card empty">
                            <div className="empty__title">{t('track.notFoundTitle')}</div>
                            <p>{t('track.notFoundBody')}</p>
                        </div>
                    )}

                    {data && (
                        <>
                            <div className="card" style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div>
                                        <div className="subtle">{t('track.driverLabel')}</div>
                                        <div style={{ fontWeight: 600 }}>{data.driverName || t('track.notAssignedYet')}</div>
                                    </div>
                                    <span className={`pill pill--${data.status === 'pending' ? 'pending' : data.status === 'cancelled' ? 'cancelled' : 'confirmed'}`}>
                                        {t(`status.${data.status}`)}
                                    </span>
                                </div>
                                <p className="subtle" style={{ lineHeight: 1.6 }}>
                                    {data.pickupLocation}{data.dropoffLocation ? ` → ${data.dropoffLocation}` : ''}
                                </p>
                            </div>

                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                {positions.length > 0 ? (
                                    <GoogleMapView positions={positions} />
                                ) : (
                                    <div className="empty" style={{ height: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <div className="empty__title">{t('track.waitingTitle')}</div>
                                        <p>{t('track.waitingBody')}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
