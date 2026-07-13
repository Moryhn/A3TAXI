import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function InvoicePrint() {
    const { auth } = useAuth();
    const { id } = useParams();
    const [invoice, setInvoice] = useState(null);

    useEffect(() => {
        api.getInvoice(auth.token, id).then(setInvoice);
    }, [id]);

    if (!invoice) return <div className="theme-light" style={{ minHeight: '100vh', padding: 40 }}>Loading…</div>;

    return (
        <div className="theme-light invoice-print" style={{ minHeight: '100vh', padding: '40px 20px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <div className="no-print" style={{ marginBottom: 24 }}>
                    <button onClick={() => window.print()} className="btn btn--primary">Print / Save as PDF</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                    <div>
                        <div className="eyebrow">A3TAXI · Invoice</div>
                        <h1 className="h1" style={{ fontSize: 28 }}>#{String(invoice.id).padStart(4, '0')}</h1>
                    </div>
                    <div className="meter meter--lg">
                        ${Number(invoice.total_amount).toFixed(2)}
                    </div>
                </div>

                <div className="card" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <div className="eyebrow">Billed to</div>
                            <div style={{ fontWeight: 600 }}>{invoice.client_name}</div>
                            <div className="subtle">{invoice.client_code}</div>
                        </div>
                        <div>
                            <div className="eyebrow">Period</div>
                            <div>{new Date(invoice.period_start).toLocaleDateString()} — {new Date(invoice.period_end).toLocaleDateString()}</div>
                            <div className="subtle">Generated {new Date(invoice.generated_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>

                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Driver</th>
                                <th>Route</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.trips.map((t) => (
                                <tr key={t.id}>
                                    <td className="subtle">{new Date(t.trip_date).toLocaleDateString()}</td>
                                    <td>{t.driver_name}</td>
                                    <td>{t.departure_location} → {t.arrival_location}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${Number(t.amount).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</td>
                                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>${Number(invoice.total_amount).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <p className="subtle" style={{ marginTop: 16 }}>Receipt photos are retained internally and are not included on this invoice.</p>
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
