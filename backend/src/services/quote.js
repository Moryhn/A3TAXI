import { getDrivingDistance } from './distance.js';
import { calculateFare } from './pricing.js';

// Shared by the scheduled booking form (reservations) and the "book now"
// dispatch request — one fare formula, never trust a client-supplied price.
export async function getRideEstimate({ pickupLocation, dropoffLocation, requestedTime, isRoundTrip, serviceType }) {
    if (serviceType !== 'ride' || !pickupLocation || !dropoffLocation) {
        return { distanceKm: null, durationMin: null, isNightRate: null, estimatedPrice: null };
    }
    const distance = await getDrivingDistance(pickupLocation, dropoffLocation);
    if (!distance) {
        return { distanceKm: null, durationMin: null, isNightRate: null, estimatedPrice: null };
    }
    const fare = calculateFare({ distanceKm: distance.distanceKm, requestedTime, isRoundTrip });
    return { ...distance, ...fare };
}
