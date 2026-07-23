import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import PlaceAutocompleteInput from '../../components/PlaceAutocompleteInput.jsx';
import MicButton from '../../components/MicButton.jsx';
import { compressImage } from '../../lib/image.js';

export default function TripEntry() {
    const { auth } = useAuth();
    const { t, lang } = useLanguage();
    const micLang = lang === 'fr' ? 'fr-CA' : 'en-US';
    const [clients, setClients] = useState([]);
    const [form, setForm] = useState({ clientAccountId: '', departureLocation: '', arrivalLocation: '', amount: '', direction: 'aller' });
    const [receipt, setReceipt] = useState(null);
    const [compressing, setCompressing] = useState(false);
    const [status, setStatus] = useState(null);
    const [saving, setSaving] = useState(false);

    async function handleReceiptChange(e) {
        const file = e.target.files[0];
        if (!file) return setReceipt(null);
        setCompressing(true);
        setReceipt(await compressImage(file));
        setCompressing(false);
    }

    useEffect(() => {
        api.listClientAccounts(auth.token).then(setClients);
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus(null);
        setSaving(true);
        const data = new FormData();
        Object.entries(form).forEach(([k, v]) => data.append(k, v));
        if (receipt) data.append('receipt', receipt);

        try {
            await api.createTrip(auth.token, data);
            setForm({ clientAccountId: '', departureLocation: '', arrivalLocation: '', amount: '', direction: 'aller' });
            setReceipt(null);
            setStatus({ ok: true, message: t('driver.tripEntry.tripSaved') });
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <div className="eyebrow">{t('driver.tripEntry.eyebrow')}</div>
            <h1 className="h1" style={{ fontSize: 26, marginBottom: 20 }}>{t('driver.tripEntry.title')}</h1>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field">
                    <label>{t('driver.tripEntry.fareLabel')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--ink)', borderRadius: 'var(--radius-md)', padding: '14px 16px', boxShadow: 'inset 0 0 0 1px rgba(245,183,0,0.25)' }}>
                        <span style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600 }}>$</span>
                        <input
                            className="input"
                            style={{ background: 'transparent', border: 'none', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, padding: 0 }}
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div className="field">
                    <label>{t('driver.tripEntry.clientLabel')}</label>
                    <select className="select" value={form.clientAccountId} onChange={(e) => setForm({ ...form, clientAccountId: e.target.value })} required>
                        <option value="">{t('driver.tripEntry.selectClient')}</option>
                        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="field">
                    <label>{t('driver.tripEntry.departureLabel')}</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <PlaceAutocompleteInput className="input" placeholder={t('driver.tripEntry.departurePlaceholder')} value={form.departureLocation} onChange={(v) => setForm({ ...form, departureLocation: v })} required />
                        </div>
                        <MicButton lang={micLang} title={t('driver.tripEntry.speakDeparture')} onResult={(text) => setForm({ ...form, departureLocation: text })} />
                    </div>
                </div>

                <div className="field">
                    <label>{t('driver.tripEntry.arrivalLabel')}</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <PlaceAutocompleteInput className="input" placeholder={t('driver.tripEntry.arrivalPlaceholder')} value={form.arrivalLocation} onChange={(v) => setForm({ ...form, arrivalLocation: v })} required />
                        </div>
                        <MicButton lang={micLang} title={t('driver.tripEntry.speakArrival')} onResult={(text) => setForm({ ...form, arrivalLocation: text })} />
                    </div>
                </div>

                <div className="field">
                    <label>{t('driver.tripEntry.directionLabel')}</label>
                    <select className="select" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                        <option value="aller">{t('driver.tripEntry.directionAller')}</option>
                        <option value="retour">{t('driver.tripEntry.directionRetour')}</option>
                        <option value="aller_retour">{t('driver.tripEntry.directionAllerRetour')}</option>
                    </select>
                </div>

                <div className="field">
                    <label>{t('driver.tripEntry.receiptLabel')}</label>
                    <input className="input" type="file" accept="image/*" capture="environment" onChange={handleReceiptChange} style={{ padding: 10 }} />
                    {compressing && <div className="subtle" style={{ marginTop: 6 }}>{t('driver.tripEntry.processingPhoto')}</div>}
                </div>

                <button type="submit" className="btn btn--primary" style={{ padding: '15px 18px', fontSize: 16 }} disabled={saving || compressing}>
                    {saving ? t('driver.tripEntry.saving') : t('driver.tripEntry.saveTrip')}
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
        </div>
    );
}
