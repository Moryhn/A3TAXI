import { listAvailableDriversWithPositions } from '../models/dispatch.js';
import { getDrivingDistance } from './distance.js';

// Among drivers who are active, shared a position recently, and aren't
// already mid-job, finds whichever is closest by real driving distance to
// the given pickup address. Returns null if no candidate is available or
// reachable — callers decide how to surface that (leave the job unassigned,
// show an error, etc.), this never throws for the "nobody's free" case.
export async function findNearestAvailableDriver(pickupAddress) {
    const candidates = await listAvailableDriversWithPositions();
    if (candidates.length === 0) return null;

    const distances = await Promise.all(candidates.map(async (driver) => {
        const distance = await getDrivingDistance({ lat: driver.lat, lng: driver.lng }, pickupAddress);
        return { driver, distance };
    }));
    const reachable = distances.filter((d) => d.distance !== null);
    if (reachable.length === 0) return null;

    reachable.sort((a, b) => a.distance.distanceKm - b.distance.distanceKm);
    return reachable[0];
}
