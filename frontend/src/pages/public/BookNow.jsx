import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, LocateFixed, ShieldCheck, MessageCircle } from 'lucide-react';
import { api } from '../../api/client.js';
import { GOOGLE_MAPS_API_KEY, loadGoogleMapsLibrary } from '../../lib/googleMaps.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { addRecentAddress } from '../../lib/recentAddresses.js';
import PlaceAutocompleteInput from '../../components/PlaceAutocompleteInput.jsx';
import RecentAddressChips from '../../components/booking/RecentAddressChips.jsx';
import RoutePreviewMap from '../../components/RoutePreviewMap.jsx';
import MeterPanel from '../../components/booking/MeterPanel.jsx';

const INITIAL_FORM = { pickupLocation: '', dropoffLocation: '', customerPhone: '' };

export default function BookNow() {
    const [theme, toggleTheme] = useTheme('a3taxi-home-theme', 'light');
    const { t, lang, toggleLang } = useLanguage();
    const [form, setForm] = useState(INITIAL_FORM);
    const [status, setStatus] = useState(null);
    const [quote, setQuote] = useState(null);
    const [quoting, setQuoting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [locating, setLocating] = useState(false);
    const [locError, setLocError] = useState(null);

    useEffect(() => {
        if (!form.pickupLocation || !form.dropoffLocation) {
            setQuote(null);
            return;
        }
        setQuoting(true);
        const timer = setTimeout(() => {
            api.getQuote({
                pickupLocation: form.pickupLocation,
                dropoffLocation: form.dropoffLocation,
                requestedTime: new Date().toISOString(),
                serviceType: 'ride',
            })
                .then((q) => setQuote(q.estimatedPrice != null ? q : null))
                .catch(() => setQuote(null))
                .finally(() => setQuoting(false));
        }, 600);
        return () => clearTimeout(timer);
    }, [form.pickupLocation, form.dropoffLocation]);

    function useMyLocation() {
        if (!window.isSecureContext) {
            setLocError('insecure');
            return;
        }
        if (!navigator.geolocation) {
            setLocError('generic');
            return;
        }
        setLocating(true);
        setLocError(null);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { Geocoder } = await loadGoogleMapsLibrary('geocoding');
                    const { results } = await new Geocoder().geocode({
                        location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
                    });
                    if (results?.[0]) {
                        setForm((f) => ({ ...f, pickupLocation: results[0].formatted_address }));
                    } else {
                        setLocError('generic');
                    }
                } catch {
                    setLocError('generic');
                } finally {
                    setLocating(false);
                }
            },
            () => {
                setLocError('generic');
                setLocating(false);
            },
            { timeout: 8000 }
        );
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus(null);
        setSubmitting(true);
        try {
            await api.createRideRequest(form);
            addRecentAddress(form.pickupLocation);
            addRecentAddress(form.dropoffLocation);
            setStatus({ ok: true, message: t('bookNow.successMessage') });
            setForm(INITIAL_FORM);
            setQuote(null);
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setSubmitting(false);
        }
    }

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
                <div style={{ maxWidth: 1040, margin: '0 auto', paddingBottom: 20 }}>
                    <h1 className="h1" style={{ fontSize: 30, marginBottom: 4 }}>{t('bookNow.title')}</h1>
                    <p className="subtle" style={{ marginBottom: 8 }}>{t('bookNow.subtitle')}</p>
                    <a href="tel:+14504442000" className="subtle" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
                        <Phone size={13} /> {t('booking.callUsLabel')} 450-444-2000
                    </a>
                </div>

                <div className="booking-grid">
                    <div className="booking-panel">
                        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="field">
                                <label htmlFor="pickup"><MapPin size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.pickupLabel')}</label>
                                <PlaceAutocompleteInput id="pickup" className="input" value={form.pickupLocation} onChange={(v) => setForm({ ...form, pickupLocation: v })} required />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <button type="button" className="btn btn--ghost" style={{ fontSize: 11, padding: '6px 10px' }} onClick={useMyLocation} disabled={locating}>
                                        <LocateFixed size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                                        {locating ? t('booking.locating') : t('booking.useMyLocation')}
                                    </button>
                                    {locError && (
                                        <span className="subtle" style={{ fontSize: 11, color: 'var(--danger)' }}>
                                            {locError === 'insecure' ? t('booking.locationInsecure') : t('booking.locationError')}
                                        </span>
                                    )}
                                </div>
                                <RecentAddressChips value={form.pickupLocation} onSelect={(v) => setForm({ ...form, pickupLocation: v })} label={t('booking.recentLabel')} />
                            </div>

                            <div className="field">
                                <label htmlFor="dropoff"><MapPin size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.dropoffLabel')}</label>
                                <PlaceAutocompleteInput id="dropoff" className="input" value={form.dropoffLocation} onChange={(v) => setForm({ ...form, dropoffLocation: v })} required />
                                <RecentAddressChips value={form.dropoffLocation} onSelect={(v) => setForm({ ...form, dropoffLocation: v })} label={t('booking.recentLabel')} />
                            </div>

                            <div className="field">
                                <label htmlFor="customerPhone"><Phone size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.phoneLabel')}</label>
                                <input id="customerPhone" name="tel" className="input" type="tel" autoComplete="tel" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} required />
                            </div>

                            {status && (
                                <div
                                    className="pill"
                                    style={{
                                        justifyContent: 'center',
                                        padding: '10px 14px',
                                        color: status.ok ? '#0f8a5f' : 'var(--danger)',
                                        background: status.ok ? 'rgba(52,211,153,0.15)' : 'rgba(240,85,76,0.12)',
                                    }}
                                >
                                    {status.message}
                                </div>
                            )}

                            <button type="submit" className="btn btn--primary" disabled={submitting}>
                                {submitting ? t('bookNow.submitting') : t('bookNow.submit')}
                            </button>
                        </form>

                        <div style={{ textAlign: 'center' }}>
                            <Link to="/" className="subtle" style={{ textDecoration: 'none' }}>{t('booking.backToHome')}</Link>
                        </div>
                    </div>

                    <div className="booking-visual">
                        <div className="route-visual">
                            {GOOGLE_MAPS_API_KEY ? (
                                <RoutePreviewMap pickup={form.pickupLocation} dropoff={form.dropoffLocation} theme={theme} />
                            ) : (
                                <div className="route-visual__placeholder">
                                    <MapPin size={26} />
                                    <span>{t('booking.mapPlaceholderService')}</span>
                                </div>
                            )}
                        </div>

                        {quoting && !quote && (
                            <div className="meter-panel">
                                <div className="meter-panel__label">{t('booking.estimatedPriceLabel')}</div>
                                <div className="meter-panel__skeleton" />
                            </div>
                        )}
                        {quote && (
                            <MeterPanel
                                value={quote.estimatedPrice}
                                lang={lang}
                                label={t('booking.estimatedPriceLabel')}
                                note={[quote.isNightRate ? t('booking.nightRateNote') : null, t('booking.priceDisclaimer')].filter(Boolean).join(' · ')}
                            />
                        )}

                        <div className="card trust-card">
                            <div className="trust-card__row"><ShieldCheck size={16} /> {t('home.trustNoSurge')}</div>
                            <div className="trust-card__row"><MessageCircle size={16} /> {t('bookNow.connectedToDispatch')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
