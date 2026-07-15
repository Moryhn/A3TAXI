import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
    listClientAccounts,
    createClientAccount,
    updateClientAccount,
    findClientAccountById,
    deleteClientAccount,
} from '../models/clientAccount.js';

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

// Soft-deletes the client into the trash bin (restorable) rather than a
// hard delete, since past trips and invoices stay referenced to it.
router.delete('/:id', requireAuth('admin'), async (req, res) => {
    const existing = await findClientAccountById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client account not found' });
    const updated = await deleteClientAccount(req.params.id);
    res.json(updated);
});

export default router;
