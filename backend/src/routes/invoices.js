import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { searchTrips, markTripsInvoiced } from '../models/trip.js';
import { createInvoice, listInvoices, findInvoiceById, invoiceTrips } from '../models/invoice.js';

const router = Router();

// Generate an invoice for a client account covering all of its un-invoiced trips in a date range
router.post('/generate', requireAuth('admin'), async (req, res) => {
    const { clientAccountId, periodStart, periodEnd } = req.body;
    if (!clientAccountId || !periodStart || !periodEnd) {
        return res.status(400).json({ error: 'clientAccountId, periodStart and periodEnd are required' });
    }

    const trips = await searchTrips({
        clientAccountId,
        dateFrom: periodStart,
        dateTo: periodEnd,
        invoiced: false,
    });

    if (trips.length === 0) {
        return res.status(400).json({ error: 'No un-invoiced trips found for this client in the given period' });
    }

    const totalAmount = trips.reduce((sum, t) => sum + Number(t.amount), 0);

    const invoice = await createInvoice({ clientAccountId, periodStart, periodEnd, totalAmount });
    await markTripsInvoiced(trips.map((t) => t.id), invoice.id);

    res.status(201).json({ ...invoice, trips });
});

router.get('/', requireAuth('admin'), async (req, res) => {
    const { clientAccountId } = req.query;
    const invoices = await listInvoices({ clientAccountId });
    res.json(invoices);
});

// Full invoice detail for printing (trips list + totals). Receipt photos are intentionally excluded.
router.get('/:id', requireAuth('admin'), async (req, res) => {
    const invoice = await findInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const trips = await invoiceTrips(req.params.id);
    res.json({ ...invoice, trips });
});

export default router;
