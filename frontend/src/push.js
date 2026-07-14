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

export async function enablePushNotifications(token) {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('permission-denied');

    const { publicKey } = await api.getVapidPublicKey(token);
    if (!publicKey) throw new Error('push-not-configured');

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await api.subscribePush(token, subscription.toJSON());
    return subscription;
}

export async function disablePushNotifications(token) {
    const subscription = await getExistingPushSubscription();
    if (!subscription) return;
    await subscription.unsubscribe();
    await api.unsubscribePush(token, subscription.endpoint).catch(() => {});
}
