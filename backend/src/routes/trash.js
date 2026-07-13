import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listDeletedTrips, restoreTrip, permanentlyDeleteTrip } from '../models/trip.js';
import { listDeletedReservations, restoreReservation, permanentlyDeleteReservation } from '../models/reservation.js';
import { listDeletedDispatchJobs, restoreDispatchJob, permanentlyDeleteDispatchJob } from '../models/dispatch.js';
import { listDeletedDrivers, restoreDriver, permanentlyDeleteDriver } from '../models/driver.js';
import { listDeletedClientAccounts, restoreClientAccount, permanentlyDeleteClientAccount } from '../models/clientAccount.js';

const router = Router();

const restoreByType = {
    trip: restoreTrip,
    reservation: restoreReservation,
    job: restoreDispatchJob,
    driver: restoreDriver,
    client: restoreClientAccount,
};

const permanentDeleteByType = {
    trip: permanentlyDeleteTrip,
    reservation: permanentlyDeleteReservation,
    job: permanentlyDeleteDispatchJob,
    driver: permanentlyDeleteDriver,
    client: permanentlyDeleteClientAccount,
};

// Everything currently in the trash, across all record types
router.get('/', requireAuth('admin'), async (req, res) => {
    const [trips, reservations, jobs, drivers, clients] = await Promise.all([
        listDeletedTrips(),
        listDeletedReservations(),
        listDeletedDispatchJobs(),
        listDeletedDrivers(),
        listDeletedClientAccounts(),
    ]);

    const items = [
        ...trips.map((t) => ({
            type: 'trip',
            id: t.id,
            label: `${t.departure_location} → ${t.arrival_location}`,
            sublabel: `${t.driver_name} · ${t.client_name} · $${Number(t.amount).toFixed(2)}`,
            deletedAt: t.deleted_at,
        })),
        ...reservations.map((r) => ({
            type: 'reservation',
            id: r.id,
            label: r.client_name,
            sublabel: `${r.pickup_location} → ${r.dropoff_location}`,
            deletedAt: r.deleted_at,
        })),
        ...jobs.map((j) => ({
            type: 'job',
            id: j.id,
            label: j.address,
            sublabel: `Dispatched to ${j.driver_name}`,
            deletedAt: j.deleted_at,
        })),
        ...drivers.map((d) => ({
            type: 'driver',
            id: d.id,
            label: d.name,
            sublabel: d.phone || d.access_code,
            deletedAt: d.deleted_at,
        })),
        ...clients.map((c) => ({
            type: 'client',
            id: c.id,
            label: c.name,
            sublabel: c.code,
            deletedAt: c.deleted_at,
        })),
    ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    res.json(items);
});

router.post('/:type/:id/restore', requireAuth('admin'), async (req, res) => {
    const restoreFn = restoreByType[req.params.type];
    if (!restoreFn) return res.status(400).json({ error: 'Unknown item type' });

    const restored = await restoreFn(req.params.id);
    if (!restored) return res.status(404).json({ error: 'Item not found' });
    res.json(restored);
});

router.delete('/:type/:id', requireAuth('admin'), async (req, res) => {
    const deleteFn = permanentDeleteByType[req.params.type];
    if (!deleteFn) return res.status(400).json({ error: 'Unknown item type' });

    try {
        await deleteFn(req.params.id);
        res.status(204).end();
    } catch (err) {
        if (err.code === '23503') {
            return res.status(409).json({ error: 'This item still has related records (trips, invoices, etc.) and can\'t be permanently deleted.' });
        }
        throw err;
    }
});

export default router;
