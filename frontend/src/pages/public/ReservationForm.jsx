import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Phone, MapPin } from 'lucide-react';
import { api } from '../../api/client.js';
import { GOOGLE_MAPS_API_KEY } from '../../lib/googleMaps.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { addRecentAddress } from '../../lib/recentAddresses.js';
import RoutePreviewMap from '../../components/RoutePreviewMap.jsx';
import ProgressTrail from '../../components/booking/ProgressTrail.jsx';
import MeterPanel from '../../components/booking/MeterPanel.jsx';
import TripStep from '../../components/booking/TripStep.jsx';
import DetailsStep from '../../components/booking/DetailsStep.jsx';
import ContactStep from '../../components/booking/ContactStep.jsx';

const INITIAL_FORM = {
    serviceType: 'ride',
    clientName: '', clientPhone: '', clientEmail: '',
    pickupLocation: '', dropoffLocation: '', requestedTime: '',
    isRoundTrip: false, passengerCount: 1, carryOnCount: 0, checkedLuggageCount: 0,
};

export default function ReservationForm() {
    const [theme, toggleTheme] = useTheme('a3taxi-home-theme', 'light');
    const { t, lang, toggleLang } = useLanguage();
    const [form, setForm] = useState(INITIAL_FORM);
    const [status, setStatus] = useState(null);
    const [quote, setQuote] = useState(null);
    const [quoting, setQuoting] = useState(false);
    const [step, setStep] = useState(0);

    const isRide = form.serviceType === 'ride';

    const steps = isRide
        ? [
            { key: 'trip', label: t('booking.stepTrip') },
            { key: 'details', label: t('booking.stepDetails') },
            { key: 'contact', label: t('booking.stepContact') },
        ]
        : [
            { key: 'trip', label: t('booking.stepTrip') },
            { key: 'contact', label: t('booking.stepContact') },
        ];
    const activeIndex = Math.min(step, steps.length - 1);
    const activeKey = steps[activeIndex].key;

    useEffect(() => {
        if (!isRide || !form.pickupLocation || !form.dropoffLocation) {
            setQuote(null);
            return;
        }
        setQuoting(true);
        const timer = setTimeout(() => {
            api.getQuote({
                pickupLocation: form.pickupLocation,
                dropoffLocation: form.dropoffLocation,
                requestedTime: form.requestedTime,
                isRoundTrip: form.isRoundTrip,
                serviceType: form.serviceType,
            })
                .then((q) => setQuote(q.estimatedPrice != null ? q : null))
                .catch(() => setQuote(null))
                .finally(() => setQuoting(false));
        }, 600);
        return () => clearTimeout(timer);
    }, [isRide, form.pickupLocation, form.dropoffLocation, form.requestedTime, form.isRoundTrip, form.serviceType]);

    function canAdvance() {
        if (activeKey === 'trip') {
            if (!form.pickupLocation || !form.requestedTime) return false;
            if (isRide && !form.dropoffLocation) return false;
        }
        return true;
    }

    function goNext() {
        if (canAdvance()) setStep(activeIndex + 1);
    }

    function goBack() {
        setStep(Math.max(0, activeIndex - 1));
    }

    function handleFormKeyDown(e) {
        if (e.key !== 'Enter' || activeIndex >= steps.length - 1) return;
        e.preventDefault();
        goNext();
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus(null);
        try {
            await api.createReservation(form);
            addRecentAddress(form.pickupLocation);
            addRecentAddress(form.dropoffLocation);
            setStatus({ ok: true, message: t('booking.successMessage') });
            setForm(INITIAL_FORM);
            setQuote(null);
            setStep(0);
        } catch (err) {
            setStatus({ ok: false, message: err.message });
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
                    <h1 className="h1" style={{ fontSize: 30, marginBottom: 4 }}>{t('booking.title')}</h1>
                    <p className="subtle" style={{ marginBottom: 8 }}>{t('booking.subtitle')}</p>
                    <a href="tel:+14504442000" className="subtle" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
                        <Phone size={13} /> {t('booking.callUsLabel')} 450-444-2000
                    </a>
                </div>

                <div className="booking-grid">
                    <div className="booking-panel">
                        <div className="card">
                            <ProgressTrail steps={steps} currentIndex={activeIndex} />
                        </div>

                        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {activeKey === 'trip' && <TripStep form={form} setForm={setForm} isRide={isRide} t={t} />}
                            {activeKey === 'details' && <DetailsStep form={form} setForm={setForm} t={t} />}
                            {activeKey === 'contact' && <ContactStep form={form} setForm={setForm} t={t} />}

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

                            <div className="wizard-nav">
                                {activeIndex > 0 && (
                                    <button type="button" className="btn btn--ghost" onClick={goBack}>
                                        <ChevronLeft size={16} style={{ verticalAlign: -3 }} /> {t('booking.back')}
                                    </button>
                                )}
                                {activeIndex < steps.length - 1 ? (
                                    <button type="button" className="btn btn--primary" onClick={goNext} disabled={!canAdvance()}>
                                        {t('booking.next')} <ChevronRight size={16} style={{ verticalAlign: -3 }} />
                                    </button>
                                ) : (
                                    <button type="submit" className="btn btn--primary">
                                        {t('booking.submit')}
                                    </button>
                                )}
                            </div>
                        </form>

                        <div style={{ textAlign: 'center' }}>
                            <Link to="/" className="subtle" style={{ textDecoration: 'none' }}>{t('booking.backToHome')}</Link>
                        </div>
                    </div>

                    <div className="booking-visual">
                        <div className="route-visual">
                            {GOOGLE_MAPS_API_KEY ? (
                                <RoutePreviewMap pickup={form.pickupLocation} dropoff={isRide ? form.dropoffLocation : null} />
                            ) : (
                                <div className="route-visual__placeholder">
                                    <MapPin size={26} />
                                    <span>{t('booking.mapPlaceholderService')}</span>
                                </div>
                            )}
                        </div>

                        {isRide && quoting && !quote && (
                            <div className="meter-panel">
                                <div className="meter-panel__label">{t('booking.estimatedPriceLabel')}</div>
                                <div className="meter-panel__skeleton" />
                            </div>
                        )}
                        {isRide && quote && (
                            <MeterPanel
                                value={quote.estimatedPrice}
                                lang={lang}
                                label={t('booking.estimatedPriceLabel')}
                                note={[quote.isNightRate ? t('booking.nightRateNote') : null, t('booking.priceDisclaimer')].filter(Boolean).join(' · ')}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
