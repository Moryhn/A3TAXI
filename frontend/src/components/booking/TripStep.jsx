import { Car, BatteryCharging, KeyRound, MapPin, Clock } from 'lucide-react';
import PlaceAutocompleteInput from '../PlaceAutocompleteInput.jsx';

const SERVICE_ICONS = { ride: Car, battery_boost: BatteryCharging, lockout: KeyRound };
const SERVICE_TYPES = ['ride', 'battery_boost', 'lockout'];

export default function TripStep({ form, setForm, isRide, t }) {
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
            </div>

            {isRide && (
                <div className="field">
                    <label htmlFor="dropoff"><MapPin size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.dropoffLabel')}</label>
                    <PlaceAutocompleteInput id="dropoff" className="input" value={form.dropoffLocation} onChange={(v) => setForm({ ...form, dropoffLocation: v })} required />
                </div>
            )}

            <div className="field">
                <label htmlFor="requestedTime"><Clock size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.dateTimeLabel')}</label>
                <input id="requestedTime" className="input" type="datetime-local" value={form.requestedTime} onChange={(e) => setForm({ ...form, requestedTime: e.target.value })} required />
            </div>
        </div>
    );
}
