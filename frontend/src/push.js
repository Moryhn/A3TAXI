import { api } from './api/client.js';

export function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function getExistingPushSubscription() {
    if (!isPushSupported()) return null;
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
}

// Each step is wrapped so a failure reports exactly where it broke (permission,
// VAPID fetch, SW readiness, browser subscribe, or saving to our backend) instead
// of a bare generic error — this stayed silent for too long across several devices
// before error surfacing existed at all.
export async function enablePushNotifications(token) {
    let permission;
    try {
        permission = await Notification.requestPermission();
    } catch (err) {
        throw new Error(`[permission] ${err.message || err}`);
    }
    if (permission !== 'granted') throw new Error('permission-denied');

    let publicKey;
    try {
        ({ publicKey } = await api.getVapidPublicKey(token));
    } catch (err) {
        throw new Error(`[vapid-fetch] ${err.message || err}`);
    }
    if (!publicKey) throw new Error('[vapid-fetch] server returned no public key');

    let registration;
    try {
        registration = await navigator.serviceWorker.ready;
    } catch (err) {
        throw new Error(`[sw-ready] ${err.message || err}`);
    }

    let subscription;
    try {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
    } catch (err) {
        throw new Error(`[subscribe] ${err.name || ''} ${err.message || err}`.trim());
    }

    try {
        await api.subscribePush(token, subscription.toJSON());
    } catch (err) {
        throw new Error(`[backend-save] ${err.message || err}`);
    }

    return subscription;
}

export async function disablePushNotifications(token) {
    const subscription = await getExistingPushSubscription();
    if (!subscription) return;
    await subscription.unsubscribe();
    await api.unsubscribePush(token, subscription.endpoint).catch(() => {});
}
