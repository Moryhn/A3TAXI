import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
    listClientAccounts,
    createClientAccount,
    updateClientAccount,
    findClientAccountById,
} from '../models/clientAccount.js';

const router = Router();

// Any authenticated user (admin or driver) can list active client accounts to select from
router.get('/', requireAuth('admin', 'driver'), async (req, res) => {
    const accounts = await listClientAccounts();
    res.json(accounts);
});

router.post('/', requireAuth('admin'), async (req, res) => {
    const { name, code, contactName, contactEmail, contactPhone } = req.body;
    if (!name || !code) {
        return res.status(400).json({ error: 'name and code are required' });
    }
    const account = await createClientAccount({ name, code, contactName, contactEmail, contactPhone });
    res.status(201).json(account);
});

router.patch('/:id', requireAuth('admin'), async (req, res) => {
    const existing = await findClientAccountById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client account not found' });

    const { name, contactName, contactEmail, contactPhone, isActive } = req.body;
    const updated = await updateClientAccount(req.params.id, { name, contactName, contactEmail, contactPhone, isActive });
    res.json(updated);
});

export default router;
