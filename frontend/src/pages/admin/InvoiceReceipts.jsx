import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, receiptPrintUrl } from '../../api/client.js';
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
            <div className="no-print" style={{ maxWidth: 720, margin: '0 auto 24px' }}>
                <div style={{ marginBottom: 24, display: 'flex', gap: 10 }}>
                    <button onClick={() => window.print()} className="btn btn--primary">{t('admin.invoiceReceipts.printButton')}</button>
                </div>
                <h1 className="h1" style={{ fontSize: 24, marginBottom: 4 }}>{t('admin.invoiceReceipts.title')}</h1>
                <p className="subtle">
                    {invoice.client_name} — {formatDate(invoice.period_start, lang)} — {formatDate(invoice.period_end, lang)}
                </p>
            </div>

            {invoice.trips.map((trip) => (
                <div key={trip.id} className="receipt-page">
                    <div className="receipt-page__meta">
                        <div>
                            <div style={{ fontWeight: 600 }}>{formatDate(trip.trip_date, lang)} — {trip.driver_name}</div>
                            <div className="subtle">{trip.departure_location} → {trip.arrival_location}</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(trip.amount, lang)}</div>
                    </div>
                    {trip.receipt_photo_url ? (
                        <div className="receipt-page__image-wrap">
                            <img src={receiptPrintUrl(trip.receipt_photo_url)} alt="" className="receipt-page__image" />
                        </div>
                    ) : (
                        <p className="subtle">{t('admin.invoiceReceipts.noReceipt')}</p>
                    )}
                </div>
            ))}

            {invoice.trips.length === 0 && (
                <p className="subtle" style={{ maxWidth: 720, margin: '0 auto' }}>{t('admin.invoiceReceipts.noTrips')}</p>
            )}

            <style>{`
                .receipt-page {
                    max-width: 720px;
                    margin: 0 auto 32px;
                    padding-bottom: 32px;
                    border-bottom: 1px solid var(--border);
                }
                .receipt-page:last-child { border-bottom: none; }
                .receipt-page__meta {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    font-size: 14px;
                }
                .receipt-page__image-wrap { text-align: center; }
                .receipt-page__image {
                    max-width: 100%;
                    max-height: 900px;
                    border: 1px solid var(--border);
                }
                @media print {
                    .no-print { display: none; }
                    .invoice-print { background: #fff !important; color: #111 !important; padding: 0 !important; }
                    .receipt-page {
                        max-width: none;
                        margin: 0;
                        padding: 12mm;
                        border-bottom: none;
                        box-sizing: border-box;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                        page-break-after: always;
                        break-inside: avoid;
                    }
                    .receipt-page:last-child { page-break-after: auto; }
                    .receipt-page__meta { flex: 0 0 auto; }
                    .receipt-page__image-wrap {
                        flex: 1 1 auto;
                        min-height: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .receipt-page__image {
                        max-width: 100%;
                        max-height: 100%;
                        width: auto;
                        height: auto;
                        object-fit: contain;
                    }
                }
            `}</style>
        </div>
    );
}
