import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import PlaceAutocompleteInput from '../../components/PlaceAutocompleteInput.jsx';
import RoutePreviewMap from '../../components/RoutePreviewMap.jsx';
import Stepper from '../../components/Stepper.jsx';
import { formatCurrency } from '../../lib/format.js';

const SERVICE_TYPES = ['ride', 'battery_boost', 'lockout'];

export default function ReservationForm() {
    const [theme, toggleTheme] = useTheme('a3taxi-home-theme', 'light');
    const { t, lang, toggleLang } = useLanguage();
    const [form, setForm] = useState({
        serviceType: 'ride',
        clientName: '', clientPhone: '', clientEmail: '',
        pickupLocation: '', dropoffLocation: '', requestedTime: '',
        isRoundTrip: false, passengerCount: 1, carryOnCount: 0, checkedLuggageCount: 0,
    });
    const [status, setStatus] = useState(null);
    const [quote, setQuote] = useState(null);
    const [quoting, setQuoting] = useState(false);

    const isRide = form.serviceType === 'ride';

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

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus(null);
        try {
            await api.createReservation(form);
            setStatus({ ok: true, message: t('booking.successMessage') });
            setForm({
                serviceType: 'ride',
                clientName: '', clientPhone: '', clientEmail: '',
                pickupLocation: '', dropoffLocation: '', requestedTime: '',
                isRoundTrip: false, passengerCount: 1, carryOnCount: 0, checkedLuggageCount: 0,
            });
            setQuote(null);
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        }
    }

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
            <div style={{ width: '100%', maxWidth: 440 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div className="rail__mark" style={{ width: 40, height: 40, fontSize: 18 }}>A3</div>
                    <div className="eyebrow" style={{ margin: 0 }}>A3TAXI</div>
                </div>
                <h1 className="h1" style={{ fontSize: 32, marginBottom: 4 }}>{t('booking.title')}</h1>
                <p className="subtle" style={{ marginBottom: 12 }}>{t('booking.subtitle')}</p>
                <a
                    href="tel:+14504442000"
                    className="subtle"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, textDecoration: 'none', fontFamily: 'var(--font-mono)' }}
                >
                    📞 {t('booking.callUsLabel')} 450-444-2000
                </a>

                <div className="tabbar" style={{ width: '100%', marginBottom: 16 }}>
                    {SERVICE_TYPES.map((s) => (
                        <button
                            key={s}
                            type="button"
                            className={`tabbar__btn ${form.serviceType === s ? 'tabbar__btn--active' : ''}`}
                            style={{ flex: 1, fontSize: 12 }}
                            onClick={() => setForm({ ...form, serviceType: s })}
                        >
                            {t(`booking.service.${s}`)}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="field">
                        <label htmlFor="clientName">{t('booking.nameLabel')}</label>
                        <input id="clientName" name="name" className="input" autoComplete="name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label htmlFor="clientPhone">{t('booking.phoneLabel')}</label>
                        <input id="clientPhone" name="tel" className="input" type="tel" autoComplete="tel" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label htmlFor="clientEmail">{t('booking.emailLabel')}</label>
                        <input id="clientEmail" name="email" className="input" type="email" autoComplete="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} />
                    </div>
                    <div className="field">
                        <label htmlFor="pickup">{isRide ? t('booking.pickupLabel') : t('booking.serviceLocationLabel')}</label>
                        <PlaceAutocompleteInput id="pickup" className="input" value={form.pickupLocation} onChange={(v) => setForm({ ...form, pickupLocation: v })} required />
                    </div>

                    {isRide && (
                        <div className="field">
                            <label htmlFor="dropoff">{t('booking.dropoffLabel')}</label>
                            <PlaceAutocompleteInput id="dropoff" className="input" value={form.dropoffLocation} onChange={(v) => setForm({ ...form, dropoffLocation: v })} required />
                        </div>
                    )}

                    <div className="field">
                        <label htmlFor="requestedTime">{t('booking.dateTimeLabel')}</label>
                        <input id="requestedTime" className="input" type="datetime-local" value={form.requestedTime} onChange={(e) => setForm({ ...form, requestedTime: e.target.value })} required />
                    </div>

                    {isRide && (
                        <>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.isRoundTrip} onChange={(e) => setForm({ ...form, isRoundTrip: e.target.checked })} />
                                {t('booking.roundTripLabel')}
                            </label>

                            <Stepper label={t('booking.passengersLabel')} value={form.passengerCount} onChange={(v) => setForm({ ...form, passengerCount: v })} min={1} max={8} />
                            <Stepper label={t('booking.carryOnLabel')} value={form.carryOnCount} onChange={(v) => setForm({ ...form, carryOnCount: v })} />
                            <Stepper label={t('booking.checkedLuggageLabel')} value={form.checkedLuggageCount} onChange={(v) => setForm({ ...form, checkedLuggageCount: v })} />

                            <RoutePreviewMap pickup={form.pickupLocation} dropoff={form.dropoffLocation} />

                            {(quoting || quote) && (
                                <div className="card" style={{ padding: 14 }}>
                                    <div className="eyebrow">{t('booking.estimatedPriceLabel')}</div>
                                    {quoting && !quote ? (
                                        <p className="subtle" style={{ marginTop: 6 }}>{t('booking.calculatingPrice')}</p>
                                    ) : quote ? (
                                        <>
                                            <div className="meter meter--sm" style={{ marginTop: 6 }}>{formatCurrency(quote.estimatedPrice, lang)}</div>
                                            {quote.isNightRate && <p className="subtle" style={{ marginTop: 6, fontSize: 12 }}>{t('booking.nightRateNote')}</p>}
                                            <p className="subtle" style={{ marginTop: 6, fontSize: 12 }}>{t('booking.priceDisclaimer')}</p>
                                        </>
                                    ) : null}
                                </div>
                            )}
                        </>
                    )}

                    <button type="submit" className="btn btn--primary" style={{ marginTop: 8, padding: '14px 18px', fontSize: 15 }}>
                        {t('booking.submit')}
                    </button>

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
                </form>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Link to="/" className="subtle" style={{ textDecoration: 'none' }}>{t('booking.backToHome')}</Link>
                </div>
            </div>
        </div>
    );
}
