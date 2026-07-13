import { useEffect, useRef, useState } from 'react';
import { GOOGLE_MAPS_API_KEY as apiKey, loadGoogleMapsLibrary } from '../lib/googleMaps.js';

const SERVICE_AREA_CENTER = { lat: 45.5019, lng: -73.5674 };

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

// Always-on live map for the booking flow: idle on the service area as soon as
// the page loads, then draws the route once pickup+dropoff are both set.
// Visual only — the authoritative distance/price comes from the server-side
// quote endpoint, never from this component.
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
                    center: SERVICE_AREA_CENTER,
                    zoom: 12,
                    mapId: 'A3TAXI_BOOKING_PREVIEW_MAP',
                    disableDefaultUI: true,
                    zoomControl: true,
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
        serviceRef.current.route(
            { origin: pickup, destination: dropoff, travelMode: 'DRIVING' },
            (result, status) => {
                if (status === 'OK') rendererRef.current.setDirections(result);
            }
        );
    }, [ready, pickup, dropoff]);

    if (!apiKey) return null;

    return (
        <>
            <div ref={mapDivRef} className="route-visual__map" style={{ opacity: ready ? 1 : 0 }} />
            {!ready && <div className="route-visual__skeleton" />}
        </>
    );
}
