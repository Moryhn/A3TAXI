import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatDate, formatCurrency } from '../../lib/format.js';

export default function Invoices() {
    const { auth } = useAuth();
    const { t, lang } = useLanguage();
    const [invoices, setInvoices] = useState([]);
    const [clients, setClients] = useState([]);
    const [form, setForm] = useState({ clientAccountId: '', periodStart: '', periodEnd: '' });
    const [error, setError] = useState('');

    async function refresh() {
        setInvoices(await api.listInvoices(auth.token));
        setClients(await api.listClientAccounts(auth.token));
    }

    useEffect(() => { refresh(); }, []);

    async function handleGenerate(e) {
        e.preventDefault();
        setError('');
        try {
            await api.generateInvoice(auth.token, form);
            refresh();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div>
            <div className="page__head">
                <div>
                    <div className="eyebrow">{t('admin.invoices.eyebrow')}</div>
                    <h1 className="h1">{t('admin.invoices.title')}</h1>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="eyebrow">{t('admin.invoices.generateEyebrow')}</div>
                <form onSubmit={handleGenerate} className="form-row" style={{ marginTop: 10 }}>
                    <div className="field" style={{ minWidth: 180 }}>
                        <label>{t('admin.invoices.clientLabel')}</label>
                        <select className="select" value={form.clientAccountId} onChange={(e) => setForm({ ...form, clientAccountId: e.target.value })} required>
                            <option value="">{t('admin.invoices.selectClient')}</option>
                            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label>{t('admin.invoices.periodStartLabel')}</label>
                        <input className="input" type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label>{t('admin.invoices.periodEndLabel')}</label>
                        <input className="input" type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn--primary">{t('admin.invoices.generate')}</button>
                </form>
                {error && <div className="pill" style={{ marginTop: 12, color: 'var(--danger)', background: 'rgba(240,85,76,0.12)' }}>{error}</div>}
            </div>

            {invoices.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">{t('admin.invoices.emptyTitle')}</div>
                    <p>{t('admin.invoices.emptyBody')}</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>{t('admin.invoices.colClient')}</th><th>{t('admin.invoices.colPeriod')}</th><th>{t('admin.invoices.colTotal')}</th><th>{t('admin.invoices.colGenerated')}</th><th></th></tr></thead>
                        <tbody>
                            {invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td>{inv.client_name}</td>
                                    <td className="subtle">{formatDate(inv.period_start, lang)} → {formatDate(inv.period_end, lang)}</td>
                                    <td><span className="meter meter--sm">{formatCurrency(inv.total_amount, lang)}</span></td>
                                    <td className="subtle">{formatDate(inv.generated_at, lang)}</td>
                                    <td><Link to={`${inv.id}/print`} style={{ color: 'var(--amber)' }}>{t('admin.invoices.viewPrint')}</Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="subtle" style={{ marginTop: 12 }}>{t('admin.invoices.receiptDisclaimer')}</p>
        </div>
    );
}
