import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
    listClientAccounts,
    createClientAccount,
    updateClientAccount,
    findClientAccountById,
    deleteClientAccount,
} from '../models/clientAccount.js';
import {
    createTemplate, deactivateTemplatesForClient, findActiveTemplateForClient, listTemplatesForClient,
} from '../models/invoiceTemplate.js';
import { uploadTemplate, multerErrors } from '../middleware/upload.js';
import { uploadInvoiceTemplate } from '../services/storage.js';
import { loadWorkbookFromBuffer, validateFieldMapping } from '../services/invoiceTemplateFill.js';

const router = Router();

// Drivers only see active accounts to log trips against; admin sees everything
router.get('/', requireAuth('admin', 'driver'), async (req, res) => {
    const accounts = await listClientAccounts({ activeOnly: req.user.role === 'driver' });
    res.json(accounts);
});

router.post('/', requireAuth('admin'), async (req, res) => {
    const { name, code, contactName, contactEmail, contactPhone, address, city, postalCode, invoiceDescription } = req.body;
    if (!name || !code) {
        return res.status(400).json({ error: 'name and code are required' });
    }
    const account = await createClientAccount({
        name, code, contactName, contactEmail, contactPhone, address, city, postalCode, invoiceDescription,
    });
    res.status(201).json(account);
});

router.patch('/:id', requireAuth('admin'), async (req, res) => {
    const existing = await findClientAccountById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client account not found' });

    const { name, contactName, contactEmail, contactPhone, isActive, address, city, postalCode, invoiceDescription } = req.body;
    const updated = await updateClientAccount(req.params.id, {
        name, contactName, contactEmail, contactPhone, isActive, address, city, postalCode, invoiceDescription,
    });
    res.json(updated);
});

// Admin uploads a per-client .xlsx invoice layout, with a field mapping
// declaring which cells the generator writes into. Validated before it's
// ever attached to a real invoice: the file must actually open, and the
// mapping must be well-formed.
router.post('/:id/template', requireAuth('admin'), multerErrors(uploadTemplate.single('file')), async (req, res) => {
    const client = await findClientAccountById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client account not found' });
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    let fieldMapping;
    try {
        fieldMapping = JSON.parse(req.body.fieldMapping || '{}');
    } catch {
        return res.status(400).json({ error: 'fieldMapping must be valid JSON' });
    }

    const mappingErrors = validateFieldMapping(fieldMapping);
    if (mappingErrors.length > 0) {
        return res.status(400).json({ error: 'Invalid field mapping', details: mappingErrors });
    }

    try {
        await loadWorkbookFromBuffer(req.file.buffer);
    } catch {
        return res.status(400).json({ error: 'Could not open this file as an Excel workbook' });
    }

    const fileUrl = await uploadInvoiceTemplate(req.file.buffer, req.params.id);
    await deactivateTemplatesForClient(req.params.id);
    const template = await createTemplate({
        clientAccountId: req.params.id, name, fileUrl, fieldMapping,
    });
    res.status(201).json(template);
});

router.get('/:id/template', requireAuth('admin'), async (req, res) => {
    const active = await findActiveTemplateForClient(req.params.id);
    const history = await listTemplatesForClient(req.params.id);
    res.json({ active, history });
});

// Soft-deletes the client into the trash bin (restorable) rather than a
// hard delete, since past trips and invoices stay referenced to it.
router.delete('/:id', requireAuth('admin'), async (req, res) => {
    const existing = await findClientAccountById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client account not found' });
    const updated = await deleteClientAccount(req.params.id);
    res.json(updated);
});

export default router;
