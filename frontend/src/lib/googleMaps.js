import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let configured = false;

// Loads a single Google Maps JS API library ('maps', 'marker', 'places', 'core', ...).
// Safe to call from multiple components — the underlying loader only injects
// the bootstrap script once and resolves each requested library independently.
export function loadGoogleMapsLibrary(name) {
    if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error('Google Maps API key not configured'));
    if (!configured) {
        setOptions({ key: GOOGLE_MAPS_API_KEY, v: 'weekly' });
        configured = true;
    }
    return importLibrary(name);
}
