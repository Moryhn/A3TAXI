import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth.js';
import driverRoutes from './routes/drivers.js';
import clientAccountRoutes from './routes/clientAccounts.js';
import tripRoutes from './routes/trips.js';
import invoiceRoutes from './routes/invoices.js';
import dispatchRoutes from './routes/dispatch.js';
import reservationRoutes from './routes/reservations.js';
import trashRoutes from './routes/trash.js';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/client-accounts', clientAccountRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/trash', trashRoutes);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`A3TAXI API listening on port ${port}`));
