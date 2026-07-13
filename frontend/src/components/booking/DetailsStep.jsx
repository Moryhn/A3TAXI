import { Users, Briefcase, Luggage } from 'lucide-react';
import Stepper from '../Stepper.jsx';
import ToggleChip from '../ToggleChip.jsx';

export default function DetailsStep({ form, setForm, t }) {
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
        </div>
    );
}
