import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatDate, formatCurrency } from '../../lib/format.js';

export default function InvoicePrint() {
    const { auth } = useAuth();
    const { id } = useParams();
    const { t, lang } = useLanguage();
    const [invoice, setInvoice] = useState(null);

    useEffect(() => {
        api.getInvoice(auth.token, id).then(setInvoice);
    }, [id]);

    if (!invoice) return <div className="theme-light" style={{ minHeight: '100vh', padding: 40 }}>{t('admin.invoicePrint.loading')}</div>;

    return (
        <div className="theme-light invoice-print" style={{ minHeight: '100vh', padding: '40px 20px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <div className="no-print" style={{ marginBottom: 24 }}>
                    <button onClick={() => window.print()} className="btn btn--primary">{t('admin.invoicePrint.printButton')}</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                    <div>
                        <div className="eyebrow">{t('admin.invoicePrint.eyebrow')}</div>
                        <h1 className="h1" style={{ fontSize: 28 }}>#{String(invoice.id).padStart(4, '0')}</h1>
                    </div>
                    <div className="meter meter--lg">
                        {formatCurrency(invoice.total_amount, lang)}
                    </div>
                </div>

                <div className="card" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <div className="eyebrow">{t('admin.invoicePrint.billedTo')}</div>
                            <div style={{ fontWeight: 600 }}>{invoice.client_name}</div>
                            <div className="subtle">{invoice.client_code}</div>
                        </div>
                        <div>
                            <div className="eyebrow">{t('admin.invoicePrint.period')}</div>
                            <div>{formatDate(invoice.period_start, lang)} — {formatDate(invoice.period_end, lang)}</div>
                            <div className="subtle">{t('admin.invoicePrint.generated', { date: formatDate(invoice.generated_at, lang) })}</div>
                        </div>
                    </div>
                </div>

                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('admin.invoicePrint.colDate')}</th>
                                <th>{t('admin.invoicePrint.colDriver')}</th>
                                <th>{t('admin.invoicePrint.colRoute')}</th>
                                <th style={{ textAlign: 'right' }}>{t('admin.invoicePrint.colAmount')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.trips.map((trip) => (
                                <tr key={trip.id}>
                                    <td className="subtle">{formatDate(trip.trip_date, lang)}</td>
                                    <td>{trip.driver_name}</td>
                                    <td>{trip.departure_location} → {trip.arrival_location}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(trip.amount, lang)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('admin.invoicePrint.total')}</td>
                                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{formatCurrency(invoice.total_amount, lang)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <p className="subtle" style={{ marginTop: 16 }}>{t('admin.invoicePrint.disclaimer')}</p>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none; }
                    .invoice-print { background: #fff !important; color: #111 !important; }
                    .invoice-print .meter {
                        background: none !important;
                        color: #111 !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
