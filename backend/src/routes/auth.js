import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findAdminByEmail } from '../models/adminUser.js';
import { findDriverByAccessCode } from '../models/driver.js';

const router = Router();

router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await findAdminByEmail(email);
    if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { sub: admin.id, role: 'admin', name: admin.name, email: admin.email },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
    );

    res.json({ token, user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' } });
});

router.post('/driver/login', async (req, res) => {
    const { accessCode } = req.body;
    if (!accessCode) {
        return res.status(400).json({ error: 'Access code is required' });
    }

    const driver = await findDriverByAccessCode(accessCode);
    if (!driver) {
        return res.status(401).json({ error: 'Invalid access code' });
    }

    const token = jwt.sign(
        { sub: driver.id, role: 'driver', name: driver.name },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
    );

    res.json({ token, user: { id: driver.id, name: driver.name, role: 'driver' } });
});

export default router;
