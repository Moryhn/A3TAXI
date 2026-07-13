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

    if (!invoice) return <p>Loading…</p>;

    return (
        <div style={{ maxWidth: 700, margin: '0 auto', fontFamily: 'sans-serif' }}>
            <div className="no-print" style={{ marginBottom: 16 }}>
                <button onClick={() => window.print()}>Print / Save as PDF</button>
            </div>

            <h1>Invoice #{invoice.id}</h1>
            <p>
                <strong>{invoice.client_name}</strong> ({invoice.client_code})<br />
                Period: {invoice.period_start} to {invoice.period_end}<br />
                Generated: {new Date(invoice.generated_at).toLocaleDateString()}
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                        <th style={{ padding: 6 }}>Date</th>
                        <th style={{ padding: 6 }}>Driver</th>
                        <th style={{ padding: 6 }}>Route</th>
                        <th style={{ padding: 6, textAlign: 'right' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.trips.map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: 6 }}>{new Date(t.trip_date).toLocaleDateString()}</td>
                            <td style={{ padding: 6 }}>{t.driver_name}</td>
                            <td style={{ padding: 6 }}>{t.departure_location} → {t.arrival_location}</td>
                            <td style={{ padding: 6, textAlign: 'right' }}>${Number(t.amount).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={3} style={{ padding: 6, textAlign: 'right', fontWeight: 'bold' }}>Total</td>
                        <td style={{ padding: 6, textAlign: 'right', fontWeight: 'bold' }}>${Number(invoice.total_amount).toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            <style>{`
                @media print {
                    .no-print { display: none; }
                }
            `}</style>
        </div>
    );
}
