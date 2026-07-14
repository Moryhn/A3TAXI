import webpush from 'web-push';
import { listSubscriptionsForDriver, deleteSubscriptionByEndpoint } from '../models/pushSubscriptions.js';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@a3taxi.local',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

// Fire-and-forget: notifies every device a driver has enabled notifications on.
// Dead subscriptions (uninstalled app, revoked permission) are pruned as they're found.
export async function sendJobNotification(driverId, job) {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

    const subscriptions = await listSubscriptionsForDriver(driverId);
    const payload = JSON.stringify({
        title: 'New job',
        body: job.address,
        url: '/#/driver/jobs',
        tag: `a3taxi-job-${job.id}`,
    });

    await Promise.all(
        subscriptions.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
            };
            try {
                await webpush.sendNotification(pushSubscription, payload);
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
