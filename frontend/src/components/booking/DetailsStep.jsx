import { Users, Briefcase, Luggage, Car, Plane } from 'lucide-react';
import Stepper from '../Stepper.jsx';
import ToggleChip from '../ToggleChip.jsx';

const VEHICLE_TYPES = ['car', 'minivan'];

export default function DetailsStep({ form, setForm, t }) {
    const isAirport = form.destinationCategory === 'airport';

    return (
        <div className="wizard-step" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ToggleChip
                label={t('booking.roundTripLabel')}
                checked={form.isRoundTrip}
                onChange={(v) => setForm({ ...form, isRoundTrip: v })}
            />

            <Stepper
                label={<span><Users size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t('booking.passengersLabel')}</span>}
                value={form.passengerCount}
                onChange={(v) => setForm({ ...form, passengerCount: v })}
                min={1}
                max={8}
            />
            <Stepper
                label={<span><Briefcase size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t('booking.carryOnLabel')}</span>}
                value={form.carryOnCount}
                onChange={(v) => setForm({ ...form, carryOnCount: v })}
            />
            <Stepper
                label={<span><Luggage size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t('booking.checkedLuggageLabel')}</span>}
                value={form.checkedLuggageCount}
                onChange={(v) => setForm({ ...form, checkedLuggageCount: v })}
            />

            {isAirport && (
                <div className="field">
                    <label><Car size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t('booking.vehicleTypeLabel')}</label>
                    <div className="tabbar" style={{ width: '100%' }}>
                        {VEHICLE_TYPES.map((v) => (
                            <button
                                key={v}
                                type="button"
                                className={`tabbar__btn ${form.vehicleType === v ? 'tabbar__btn--active' : ''}`}
                                style={{ flex: 1, fontSize: 12 }}
                                onClick={() => setForm({ ...form, vehicleType: v })}
                            >
                                {t(`booking.vehicleType.${v}`)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isAirport && form.isRoundTrip && (
                <>
                    <div className="field">
                        <label htmlFor="returnFlightNumber"><Plane size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t('booking.returnFlightNumberLabel')}</label>
                        <input
                            id="returnFlightNumber"
                            className="input"
                            placeholder={t('booking.returnFlightNumberPlaceholder')}
                            value={form.returnFlightNumber}
                            onChange={(e) => setForm({ ...form, returnFlightNumber: e.target.value })}
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="returnArrivalTime">{t('booking.returnArrivalTimeLabel')}</label>
                        <input
                            id="returnArrivalTime"
                            className="input"
                            type="datetime-local"
                            value={form.returnArrivalTime}
                            onChange={(e) => setForm({ ...form, returnArrivalTime: e.target.value })}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
