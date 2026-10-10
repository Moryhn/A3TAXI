import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Plane, User, Clock, StickyNote, ShieldCheck, MessageCircle } from 'lucide-react';
import { api } from '../../api/client.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { addRecentAddress } from '../../lib/recentAddresses.js';
import { localInputToUtcIso } from '../../lib/time.js';
import PlaceAutocompleteInput from '../../components/PlaceAutocompleteInput.jsx';
import RecentAddressChips from '../../components/booking/RecentAddressChips.jsx';

// Pre-filled pickup point for this dedicated link, so the client doesn't have
// to type it — but still editable (e.g. a different terminal or pickup spot).
// Geocodable as-is by the Routes API call the backend makes for the price
// estimate (getRideEstimate).
const AIRPORT_ADDRESS = 'Aéroport international Montréal-Trudeau (YUL), Montréal, QC';

const INITIAL_FORM = {
    clientName: '', clientPhone: '', pickupLocation: AIRPORT_ADDRESS, dropoffLocation: '', requestedTime: '',
    returnFlightNumber: '', notes: '',
};

// A single-purpose variant of ReservationForm — one link (/airport-pickup)
// to text a client who's landing and needs a ride out. Pickup defaults to the
// airport; everything else still goes through the same POST /reservations
// pipeline (SMS confirmation to the client, "add to calendar" text to admin)
// as every other booking channel.
export default function AirportPickup() {
    const [theme, toggleTheme] = useTheme('a3taxi-home-theme', 'light');
    const { t, lang, toggleLang } = useLanguage();
    const [form, setForm] = useState(INITIAL_FORM);
    const [status, setStatus] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus(null);
        setSubmitting(true);
        try {
            await api.createReservation({
                ...form,
                serviceType: 'ride',
                requestedTime: localInputToUtcIso(form.requestedTime),
                destinationCategory: 'local',
            });
            addRecentAddress(form.pickupLocation);
            addRecentAddress(form.dropoffLocation);
            setStatus({ ok: true, message: t('booking.successMessage') });
            setForm(INITIAL_FORM);
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
                <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 20 }}>
                    <h1 className="h1" style={{ fontSize: 28, marginBottom: 4 }}>{t('airportPickup.title')}</h1>
                    <p className="subtle" style={{ marginBottom: 8 }}>{t('airportPickup.subtitle')}</p>
                    <a href="tel:+14504442000" className="subtle" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
                        <Phone size={13} /> {t('booking.callUsLabel')} 450-444-2000
                    </a>

                    <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                        <div className="field">
                            <label><MapPin size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.pickupLabel')}</label>
                            <PlaceAutocompleteInput id="pickup" className="input" value={form.pickupLocation} onChange={(v) => setForm({ ...form, pickupLocation: v })} required />
                        </div>

                        <div className="field">
                            <label htmlFor="clientName"><User size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.nameLabel')}</label>
                            <input id="clientName" name="name" className="input" autoComplete="name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required />
                        </div>

                        <div className="field">
                            <label htmlFor="clientPhone"><Phone size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.phoneLabel')}</label>
                            <input id="clientPhone" name="tel" className="input" type="tel" autoComplete="tel" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} required />
                        </div>

                        <div className="field">
                            <label htmlFor="returnFlightNumber"><Plane size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.returnFlightNumberLabel')}</label>
                            <input
                                id="returnFlightNumber"
                                className="input"
                                placeholder={t('booking.returnFlightNumberPlaceholder')}
                                value={form.returnFlightNumber}
                                onChange={(e) => setForm({ ...form, returnFlightNumber: e.target.value })}
                                required
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="requestedTime"><Clock size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('airportPickup.dateTimeLabel')}</label>
                            <input id="requestedTime" className="input" type="datetime-local" value={form.requestedTime} onChange={(e) => setForm({ ...form, requestedTime: e.target.value })} required />
                        </div>

                        <div className="field">
                            <label htmlFor="dropoff"><MapPin size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.dropoffLabel')}</label>
                            <PlaceAutocompleteInput id="dropoff" className="input" value={form.dropoffLocation} onChange={(v) => setForm({ ...form, dropoffLocation: v })} required />
                            <RecentAddressChips value={form.dropoffLocation} onSelect={(v) => setForm({ ...form, dropoffLocation: v })} label={t('booking.recentLabel')} />
                        </div>

                        <div className="field">
                            <label htmlFor="notes"><StickyNote size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('airportPickup.notesLabel')}</label>
                            <textarea
                                id="notes"
                                className="input"
                                rows={3}
                                placeholder={t('airportPickup.notesPlaceholder')}
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            />
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
                            {t('airportPickup.submit')}
                        </button>
                    </form>

                    <div className="card trust-card" style={{ marginTop: 16 }}>
                        <div className="trust-card__row"><ShieldCheck size={16} /> {t('home.trustNoSurge')}</div>
                        <div className="trust-card__row"><MessageCircle size={16} /> {t('home.trustSms')}</div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <Link to="/" className="subtle" style={{ textDecoration: 'none' }}>{t('booking.backToHome')}</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
