import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { searchTrips, markTripsInvoiced } from '../models/trip.js';
import {
    createInvoice, listInvoices, findInvoiceById, invoiceTrips,
    findInvoiceByClientAndPeriod, findLatestInvoiceForClient, widenInvoicePeriod,
    addAmountToInvoice, deleteInvoice, updateInvoice, finalizeInvoice, setInvoiceTemplateIfUnset,
} from '../models/invoice.js';
import { findActiveTemplateForClient, findTemplateById } from '../models/invoiceTemplate.js';
import { loadWorkbookFromBuffer, fillInvoiceTemplate } from '../services/invoiceTemplateFill.js';

const router = Router();

// Generate an invoice for a client account covering all of its un-invoiced trips
// in a date range. A client has at most one current (non-deleted) invoice at a
// time: re-running Generate — whether for the exact same period, a narrower
// one, or one extended to pick up a few more days — always tops up that same
// invoice (widening its stated period to cover the full range checked so far)
// instead of starting a second, overlapping invoice for the same client. Admin
// deletes the invoice (Trash, restorable) to deliberately start a fresh one.
router.post('/generate', requireAuth('admin'), async (req, res) => {
    const { clientAccountId, periodStart, periodEnd } = req.body;
    const invoiceNumber = req.body.invoiceNumber || null;
    const invoiceDate = req.body.invoiceDate || null;
    if (!clientAccountId || !periodStart || !periodEnd) {
        return res.status(400).json({ error: 'clientAccountId, periodStart and periodEnd are required' });
    }

    const newTrips = await searchTrips({
        clientAccountId,
        dateFrom: periodStart,
        dateTo: periodEnd,
        invoiced: false,
    });

    let invoice = (await findInvoiceByClientAndPeriod(clientAccountId, periodStart, periodEnd))
        || (await findLatestInvoiceForClient(clientAccountId));

    if (!invoice && newTrips.length === 0) {
        return res.status(400).json({ error: 'No un-invoiced trips found for this client in the given period' });
    }

    if (invoice) {
        invoice = await widenInvoicePeriod(invoice.id, periodStart, periodEnd);
    }

    const activeTemplate = await findActiveTemplateForClient(clientAccountId);

    if (newTrips.length > 0) {
        const additionalAmount = newTrips.reduce((sum, t) => sum + Number(t.amount), 0);
        if (invoice) {
            invoice = await addAmountToInvoice(invoice.id, additionalAmount);
        } else {
            invoice = await createInvoice({
                clientAccountId, periodStart, periodEnd, totalAmount: additionalAmount, invoiceNumber, invoiceDate,
            });
        }
        await markTripsInvoiced(newTrips.map((t) => t.id), invoice.id);
    }

    if (activeTemplate) {
        invoice = (await setInvoiceTemplateIfUnset(invoice.id, activeTemplate.id)) || invoice;
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

// Fills the invoice's attached client template with its current trip data
// and streams the result — generated on demand, not stored, so it always
// reflects the invoice's latest state right up until it's finalized.
router.get('/:id/export.xlsx', requireAuth('admin'), async (req, res) => {
    const invoice = await findInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (!invoice.template_id) {
        return res.status(404).json({ error: 'This invoice has no Excel template attached — use Print instead' });
    }

    const template = await findTemplateById(invoice.template_id);
    const fileRes = await fetch(template.file_url);
    if (!fileRes.ok) return res.status(502).json({ error: 'Could not load the stored template file' });
    const buffer = Buffer.from(await fileRes.arrayBuffer());

    const workbook = await loadWorkbookFromBuffer(buffer);
    const trips = await invoiceTrips(invoice.id);
    const periodLabel = `${new Date(invoice.period_start).toISOString().slice(0, 10)} — ${new Date(invoice.period_end).toISOString().slice(0, 10)}`;
    const clientCityLine = [invoice.client_city, invoice.client_postal_code].filter(Boolean).join(', ');
    fillInvoiceTemplate(workbook, {
        clientName: invoice.client_name,
        periodLabel,
        trips,
        clientAddress: invoice.client_address,
        clientCityLine,
        clientPhone: invoice.client_phone,
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date ? new Date(invoice.invoice_date).toISOString().slice(0, 10) : null,
    }, template.field_mapping);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${invoice.client_name}-${invoice.id}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
});

// Admin corrects the invoice number/date after the fact (e.g. to match an
// existing paper numbering scheme) — total/trips/period stay generation-only.
router.patch('/:id', requireAuth('admin'), async (req, res) => {
    const existing = await findInvoiceById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    if (existing.finalized_at) return res.status(409).json({ error: 'This invoice has been finalized and can no longer be changed' });

    const invoiceNumber = req.body.invoiceNumber || null;
    const invoiceDate = req.body.invoiceDate || null;
    const invoice = await updateInvoice(req.params.id, { invoiceNumber, invoiceDate });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
});

// One-way lock: once an invoice has been sent to the client it must stop
// changing — no more edits, and it stops absorbing new trips via Generate
// (see findLatestInvoiceForClient). To correct a finalized invoice, admin
// deletes it (Trash, restorable) rather than un-finalizing it in place.
router.post('/:id/finalize', requireAuth('admin'), async (req, res) => {
    const invoice = await finalizeInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
});

// Moves the invoice to Trash and frees its trips to be invoiced again
router.delete('/:id', requireAuth('admin'), async (req, res) => {
    const invoice = await findInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await deleteInvoice(req.params.id);
    res.status(204).end();
});

export default router;
