import { useState } from 'react';
import { Car, BatteryCharging, KeyRound, MapPin, Clock, LocateFixed } from 'lucide-react';
import PlaceAutocompleteInput from '../PlaceAutocompleteInput.jsx';
import RecentAddressChips from './RecentAddressChips.jsx';
import { loadGoogleMapsLibrary } from '../../lib/googleMaps.js';

const SERVICE_ICONS = { ride: Car, battery_boost: BatteryCharging, lockout: KeyRound };
const SERVICE_TYPES = ['ride', 'battery_boost', 'lockout'];

export default function TripStep({ form, setForm, isRide, t }) {
    const [locating, setLocating] = useState(false);
    const [locError, setLocError] = useState(null);

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

    return (
        <div className="wizard-step" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="tabbar" style={{ width: '100%' }}>
                {SERVICE_TYPES.map((s) => {
                    const Icon = SERVICE_ICONS[s];
                    return (
                        <button
                            key={s}
                            type="button"
                            className={`tabbar__btn ${form.serviceType === s ? 'tabbar__btn--active' : ''}`}
                            style={{ flex: 1, fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            onClick={() => setForm({ ...form, serviceType: s })}
                        >
                            <Icon size={14} /> {t(`booking.service.${s}`)}
                        </button>
                    );
                })}
            </div>

            <div className="field">
                <label htmlFor="pickup"><MapPin size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{isRide ? t('booking.pickupLabel') : t('booking.serviceLocationLabel')}</label>
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

            {isRide && (
                <div className="field">
                    <label htmlFor="dropoff"><MapPin size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.dropoffLabel')}</label>
                    <PlaceAutocompleteInput id="dropoff" className="input" value={form.dropoffLocation} onChange={(v) => setForm({ ...form, dropoffLocation: v })} required />
                    <RecentAddressChips value={form.dropoffLocation} onSelect={(v) => setForm({ ...form, dropoffLocation: v })} label={t('booking.recentLabel')} />
                </div>
            )}

            <div className="field">
                <label htmlFor="requestedTime"><Clock size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.dateTimeLabel')}</label>
                <input id="requestedTime" className="input" type="datetime-local" value={form.requestedTime} onChange={(e) => setForm({ ...form, requestedTime: e.target.value })} required />
            </div>
        </div>
    );
}
