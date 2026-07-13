import { User, Phone, Mail } from 'lucide-react';

export default function ContactStep({ form, setForm, t }) {
    return (
        <div className="wizard-step" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
                <label htmlFor="clientName"><User size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.nameLabel')}</label>
                <input id="clientName" name="name" className="input" autoComplete="name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required />
            </div>
            <div className="field">
                <label htmlFor="clientPhone"><Phone size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.phoneLabel')}</label>
                <input id="clientPhone" name="tel" className="input" type="tel" autoComplete="tel" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} required />
            </div>
            <div className="field">
                <label htmlFor="clientEmail"><Mail size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('booking.emailLabel')}</label>
                <input id="clientEmail" name="email" className="input" type="email" autoComplete="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} />
            </div>
        </div>
    );
}
