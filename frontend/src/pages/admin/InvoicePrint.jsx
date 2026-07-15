import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatDate, formatCurrency, calculateTaxBreakdown } from '../../lib/format.js';

// A3TAXI's own letterhead + tax registration numbers — fixed regardless of
// which client the invoice is billed to, so they live here rather than in
// the database.
const COMPANY = {
    name: 'A3Taxi',
    address: '785 Av Jean-Baptiste-Varin',
    cityLine: 'La Prairie, QC J5R 6P3',
    phone: '(450) 444-2000',
    email: 'a3taxi@hotmail.com',
    website: 'www.taxicandiaclaprairie.ca',
    gstNumber: '78103 0507 RT0001',
    qstNumber: '1228754711 TQ0001',
    footerPhone: '514-917-6000',
};

export default function InvoicePrint() {
    const { auth } = useAuth();
    const { id } = useParams();
    const { t, lang } = useLanguage();
    const [invoice, setInvoice] = useState(null);

    useEffect(() => {
        api.getInvoice(auth.token, id).then(setInvoice);
    }, [id]);

    if (!invoice) return <div className="theme-light" style={{ minHeight: '100vh', padding: 40 }}>{t('admin.invoicePrint.loading')}</div>;

    const tax = calculateTaxBreakdown(invoice.total_amount);
    const invoiceNumber = invoice.invoice_number || `#${String(invoice.id).padStart(4, '0')}`;
    const invoiceDate = invoice.invoice_date || invoice.generated_at;

    return (
        <div className="theme-light invoice-print" style={{ minHeight: '100vh', padding: '40px 20px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <div className="no-print" style={{ marginBottom: 24 }}>
                    <button onClick={() => window.print()} className="btn btn--primary">{t('admin.invoicePrint.printButton')}</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>{COMPANY.name}</div>
                        <div className="subtle">{COMPANY.address}</div>
                        <div className="subtle">{COMPANY.cityLine}</div>
                        <div className="subtle">{COMPANY.phone}</div>
                        <div className="subtle">{COMPANY.email} · {COMPANY.website}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h1 className="h1" style={{ fontSize: 28, marginBottom: 8 }}>{t('admin.invoicePrint.title')}</h1>
                        <div className="subtle">{t('admin.invoicePrint.dateLabel')}: {formatDate(invoiceDate, lang)}</div>
                        <div className="subtle">{t('admin.invoicePrint.numberLabel')}: {invoiceNumber}</div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="eyebrow">{t('admin.invoicePrint.billedTo')}</div>
                    <div style={{ fontWeight: 600 }}>{invoice.client_name}</div>
                    {invoice.client_address && <div className="subtle">{invoice.client_address}</div>}
                    {(invoice.client_city || invoice.client_postal_code) && (
                        <div className="subtle">{[invoice.client_city, invoice.client_postal_code].filter(Boolean).join(', ')}</div>
                    )}
                    {invoice.client_phone && <div className="subtle">{invoice.client_phone}</div>}
                    <div className="subtle" style={{ marginTop: 8 }}>
                        {t('admin.invoicePrint.period')}: {formatDate(invoice.period_start, lang)} — {formatDate(invoice.period_end, lang)}
                    </div>
                </div>

                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('admin.invoicePrint.colDate')}</th>
                                <th>{t('admin.invoicePrint.colDescription')}</th>
                                <th>{t('admin.invoicePrint.colDeparture')}</th>
                                <th>{t('admin.invoicePrint.colArrival')}</th>
                                <th style={{ textAlign: 'right' }}>{t('admin.invoicePrint.colAmount')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.trips.map((trip) => (
                                <tr key={trip.id}>
                                    <td className="subtle">{formatDate(trip.trip_date, lang)}</td>
                                    <td>{invoice.client_invoice_description || trip.driver_name}</td>
                                    <td>{trip.departure_location}</td>
                                    <td>{trip.arrival_location}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(trip.amount, lang)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 20, gap: 20 }}>
                    <div className="subtle" style={{ fontSize: 13 }}>
                        <div>{t('admin.invoicePrint.gstAccount')}: {COMPANY.gstNumber}</div>
                        <div>{t('admin.invoicePrint.qstAccount')}: {COMPANY.qstNumber}</div>
                    </div>
                    <div style={{ minWidth: 220 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span className="subtle">{t('admin.invoicePrint.subtotal')}</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(tax.preTax, lang)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span className="subtle">{t('admin.invoicePrint.gst')}</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(tax.gst, lang)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span className="subtle">{t('admin.invoicePrint.qst')}</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(tax.qst, lang)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 4, borderTop: '2px solid currentColor', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <span>{t('admin.invoicePrint.total')}</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(tax.total, lang)}</span>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 32 }}>
                    <p>{t('admin.invoicePrint.thankYou')}</p>
                    <p className="subtle">{t('admin.invoicePrint.footerContact', { phone: COMPANY.footerPhone, email: COMPANY.email })}</p>
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
