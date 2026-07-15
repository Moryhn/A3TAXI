import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { searchTrips, markTripsInvoiced } from '../models/trip.js';
import {
    createInvoice, listInvoices, findInvoiceById, invoiceTrips,
    findInvoiceByClientAndPeriod, addAmountToInvoice, deleteInvoice,
} from '../models/invoice.js';

const router = Router();

// Generate an invoice for a client account covering all of its un-invoiced trips
// in a date range. If an invoice already exists for this exact client+period —
// from an earlier generation, possibly before every driver had logged their
// trips yet — newly-qualifying trips are added to it instead of starting a
// second, duplicate invoice for the same client and period.
router.post('/generate', requireAuth('admin'), async (req, res) => {
    const { clientAccountId, periodStart, periodEnd } = req.body;
    if (!clientAccountId || !periodStart || !periodEnd) {
        return res.status(400).json({ error: 'clientAccountId, periodStart and periodEnd are required' });
    }

    const newTrips = await searchTrips({
        clientAccountId,
        dateFrom: periodStart,
        dateTo: periodEnd,
        invoiced: false,
    });

    let invoice = await findInvoiceByClientAndPeriod(clientAccountId, periodStart, periodEnd);

    if (!invoice && newTrips.length === 0) {
        return res.status(400).json({ error: 'No un-invoiced trips found for this client in the given period' });
    }

    if (newTrips.length > 0) {
        const additionalAmount = newTrips.reduce((sum, t) => sum + Number(t.amount), 0);
        if (invoice) {
            invoice = await addAmountToInvoice(invoice.id, additionalAmount);
        } else {
            invoice = await createInvoice({ clientAccountId, periodStart, periodEnd, totalAmount: additionalAmount });
        }
        await markTripsInvoiced(newTrips.map((t) => t.id), invoice.id);
    }

    const trips = await invoiceTrips(invoice.id);
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

// Moves the invoice to Trash and frees its trips to be invoiced again
router.delete('/:id', requireAuth('admin'), async (req, res) => {
    const invoice = await findInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await deleteInvoice(req.params.id);
    res.status(204).end();
});

export default router;
