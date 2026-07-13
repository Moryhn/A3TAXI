import { useEffect, useRef, useState } from 'react';
import { GOOGLE_MAPS_API_KEY as apiKey, loadGoogleMapsLibrary } from '../lib/googleMaps.js';

const SERVICE_AREA_CENTER = { lat: 45.5019, lng: -73.5674 };

// Branded map skins (matching global.css tokens) instead of Google's default
// blue-road styling — keeps the map from clashing with the app's theme.
const MAP_STYLE_DARK = [
    { elementType: 'geometry', stylers: [{ color: '#1d2127' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#14171b' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8a93a3' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#333944' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#262b33' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#14171b' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#333944' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#c99500' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1216' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4b5563' }] },
];

const MAP_STYLE_LIGHT = [
    { elementType: 'geometry', stylers: [{ color: '#faf7f0' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b6455' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#faf7f0' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#e4dfd3' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e4dfd3' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f1ece0' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#c99500' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dce9f0' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#8a93a3' }] },
];

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
// quote endpoint, never from this component. Styled to match the app's own
// light/dark tokens rather than Google's default skin — no mapId is set,
// since a mapId's cloud-based styling would silently override the styles below.
export default function RoutePreviewMap({ pickup, dropoff, theme }) {
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
                    disableDefaultUI: true,
                    zoomControl: true,
                    styles: theme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT,
                });
                serviceRef.current = new api.DirectionsService();
                rendererRef.current = new api.DirectionsRenderer({
                    map: mapRef.current,
                    polylineOptions: { strokeColor: '#f5b700', strokeWeight: 5 },
                });
                setReady(true);
            })
            .catch(() => {});
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (mapRef.current) mapRef.current.setOptions({ styles: theme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT });
    }, [theme]);

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
