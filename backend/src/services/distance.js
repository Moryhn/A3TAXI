const ROUTES_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// Falls back to null when the server-side Google Maps key isn't configured (local dev,
// or Routes API not yet enabled on the Cloud project) — callers should degrade
// gracefully (hide the price estimate) rather than fail the whole request.
export async function getDrivingDistance(originAddress, destinationAddress) {
    if (!ROUTES_API_KEY) {
        console.log('[distance:stub] GOOGLE_MAPS_API_KEY not configured, skipping distance lookup');
        return null;
    }

    let response;
    try {
        response = await fetch(ROUTES_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': ROUTES_API_KEY,
                'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
            },
            body: JSON.stringify({
                origin: { address: originAddress },
                destination: { address: destinationAddress },
                travelMode: 'DRIVE',
                units: 'METRIC',
            }),
        });
    } catch (err) {
        console.error('Routes API request failed:', err.message);
        return null;
    }

    if (!response.ok) {
        console.error('Routes API error:', response.status, await response.text());
        return null;
    }

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) return null;

    return {
        distanceKm: Math.round((route.distanceMeters / 1000) * 100) / 100,
        durationMin: Math.round(parseInt(route.duration, 10) / 60),
    };
}
