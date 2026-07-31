import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, receiptUrl } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatDate, formatCurrency } from '../../lib/format.js';

export default function InvoiceReceipts() {
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
                <div className="no-print" style={{ marginBottom: 24, display: 'flex', gap: 10 }}>
                    <button onClick={() => window.print()} className="btn btn--primary">{t('admin.invoiceReceipts.printButton')}</button>
                </div>

                <h1 className="h1" style={{ fontSize: 24, marginBottom: 4 }}>{t('admin.invoiceReceipts.title')}</h1>
                <p className="subtle" style={{ marginBottom: 32 }}>
                    {invoice.client_name} — {formatDate(invoice.period_start, lang)} — {formatDate(invoice.period_end, lang)}
                </p>

                {invoice.trips.map((trip, idx) => (
                    <div key={trip.id} className="receipt-page" style={{ marginBottom: 32, paddingBottom: 32, borderBottom: idx < invoice.trips.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14 }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>{formatDate(trip.trip_date, lang)} — {trip.driver_name}</div>
                                <div className="subtle">{trip.departure_location} → {trip.arrival_location}</div>
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(trip.amount, lang)}</div>
                        </div>
                        {trip.receipt_photo_url ? (
                            <img
                                src={receiptUrl(trip.receipt_photo_url)}
                                alt=""
                                style={{ maxWidth: '100%', maxHeight: 900, display: 'block', border: '1px solid var(--border)' }}
                            />
                        ) : (
                            <p className="subtle">{t('admin.invoiceReceipts.noReceipt')}</p>
                        )}
                    </div>
                ))}

                {invoice.trips.length === 0 && (
                    <p className="subtle">{t('admin.invoiceReceipts.noTrips')}</p>
                )}
            </div>

            <style>{`
                @media print {
                    .no-print { display: none; }
                    .invoice-print { background: #fff !important; color: #111 !important; }
                    .receipt-page { break-inside: avoid; page-break-after: always; }
                }
            `}</style>
        </div>
    );
}
