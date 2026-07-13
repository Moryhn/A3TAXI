import { useEffect, useRef, useState } from 'react';
import { GOOGLE_MAPS_API_KEY as apiKey, loadGoogleMapsLibrary } from '../lib/googleMaps.js';

let loaderPromise = null;

function loadRouteMap() {
    if (!loaderPromise) {
        loaderPromise = Promise.all([
            loadGoogleMapsLibrary('maps'),
            loadGoogleMapsLibrary('routes'),
        ]).then(([{ Map }, { DirectionsService, DirectionsRenderer }]) => ({
            Map,
            DirectionsService,
            DirectionsRenderer,
        }));
    }
    return loaderPromise;
}

// Visual-only route preview for the booking form (pickup/dropoff pins + route line).
// Not used for pricing — the authoritative distance comes from the server-side quote
// endpoint. Renders nothing if the map key isn't configured or the route fails to load,
// since this is a secondary visual element, not something that should block booking.
export default function RoutePreviewMap({ pickup, dropoff }) {
    const mapDivRef = useRef(null);
    const mapRef = useRef(null);
    const rendererRef = useRef(null);
    const serviceRef = useRef(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!apiKey) return;
        let cancelled = false;
        loadRouteMap()
            .then((api) => {
                if (cancelled || mapRef.current) return;
                mapRef.current = new api.Map(mapDivRef.current, {
                    center: { lat: 45.5019, lng: -73.5674 },
                    zoom: 11,
                    mapId: 'A3TAXI_BOOKING_PREVIEW_MAP',
                });
                serviceRef.current = new api.DirectionsService();
                rendererRef.current = new api.DirectionsRenderer({ map: mapRef.current });
                setReady(true);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!ready || !pickup || !dropoff) return;
        // The map was first created while its container was height:0 (before pickup/dropoff
        // were both set), so it needs an explicit resize nudge now that it's visible —
        // otherwise Google Maps renders it gray/broken at the old zero-size viewport.
        window.google.maps.event.trigger(mapRef.current, 'resize');
        serviceRef.current.route(
            { origin: pickup, destination: dropoff, travelMode: 'DRIVING' },
            (result, status) => {
                if (status === 'OK') rendererRef.current.setDirections(result);
            }
        );
    }, [ready, pickup, dropoff]);

    if (!apiKey) return null;

    // Always mounted once apiKey is present, so mapDivRef is attached by the time the
    // map-init effect above runs on mount — collapsing this to height:0 instead of
    // conditionally rendering it would leave mapDivRef.current null when needed.
    return (
        <div
            ref={mapDivRef}
            style={{ width: '100%', height: pickup && dropoff ? 220 : 0, overflow: 'hidden', borderRadius: 8, transition: 'height 0.2s ease' }}
        />
    );
}
