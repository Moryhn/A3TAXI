import webpush from 'web-push';
import { listSubscriptionsForDriver, listSubscriptionsForAdmin, deleteSubscriptionByEndpoint } from '../models/pushSubscriptions.js';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@a3taxi.local',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

async function sendToSubscriptions(subscriptions, payload) {
    await Promise.all(
        subscriptions.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
            };
            try {
                await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
            } catch (err) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await deleteSubscriptionByEndpoint(sub.endpoint);
                } else {
                    console.error('Push notification failed:', err.message);
                }
            }
        })
    );
}

// Fire-and-forget: notifies every device a driver has enabled notifications on.
// Dead subscriptions (uninstalled app, revoked permission) are pruned as they're found.
export async function sendJobNotification(driverId, job) {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

    const subscriptions = await listSubscriptionsForDriver(driverId);
    await sendToSubscriptions(subscriptions, {
        title: 'New job',
        body: job.address,
        url: '/#/driver/jobs',
        tag: `a3taxi-job-${job.id}`,
    });
}

// Fires the moment a public "book a ride" reservation is created — the
// admin's fastest way to know, instead of waiting on an external calendar's
// own polling schedule (see services/ics.js).
export async function sendReservationNotification(reservation) {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

    const subscriptions = await listSubscriptionsForAdmin();
    await sendToSubscriptions(subscriptions, {
        title: 'Nouvelle réservation',
        body: `${reservation.client_name} — ${reservation.pickup_location}`,
        url: '/#/admin/reservations',
        tag: `a3taxi-reservation-${reservation.id}`,
    });
}

// Fires when a customer's SMS reply comes in through the SMS Gate webhook
// (routes/smsGateWebhook.js) — the driver's phone might not have the app
// open, so a push is the only way they'd notice a reply arrived.
export async function sendJobMessageNotification(driverId, jobId, body) {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

    const subscriptions = await listSubscriptionsForDriver(driverId);
    await sendToSubscriptions(subscriptions, {
        title: 'Nouveau message du client',
        body,
        url: '/#/driver/jobs',
        tag: `a3taxi-job-message-${jobId}`,
    });
}
