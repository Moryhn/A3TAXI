import { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let loaderPromise = null;

function loadGoogleMaps() {
    if (!loaderPromise) {
        setOptions({ key: apiKey, v: 'weekly' });
        loaderPromise = Promise.all([
            importLibrary('maps'),
            importLibrary('marker'),
            importLibrary('core'),
        ]).then(([{ Map }, { AdvancedMarkerElement }, { LatLngBounds }]) => ({
            Map,
            AdvancedMarkerElement,
            LatLngBounds,
        }));
    }
    return loaderPromise;
}

// Renders driver positions as markers on a live Google Map.
// Falls back to a message if VITE_GOOGLE_MAPS_API_KEY isn't configured.
export default function GoogleMapView({ positions }) {
    const mapDivRef = useRef(null);
    const mapRef = useRef(null);
    const apiRef = useRef(null);
    const markersRef = useRef(new Map());
    const [error, setError] = useState('');

    useEffect(() => {
        if (!apiKey) return;

        let cancelled = false;
        loadGoogleMaps()
            .then((api) => {
                if (cancelled || mapRef.current) return;
                apiRef.current = api;
                mapRef.current = new api.Map(mapDivRef.current, {
                    center: { lat: 40.7128, lng: -74.006 },
                    zoom: 11,
                    mapId: 'A3TAXI_DISPATCH_MAP',
                });
            })
            .catch((err) => setError(err.message));

        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!apiKey || !mapRef.current || !apiRef.current || !positions?.length) return;

        const api = apiRef.current;
        const bounds = new api.LatLngBounds();
        const seen = new Set();

        for (const p of positions) {
            seen.add(p.driver_id);
            const position = { lat: Number(p.lat), lng: Number(p.lng) };
            bounds.extend(position);

            let marker = markersRef.current.get(p.driver_id);
            if (!marker) {
                marker = new api.AdvancedMarkerElement({
                    map: mapRef.current,
                    position,
                    title: p.driver_name,
                });
                markersRef.current.set(p.driver_id, marker);
            } else {
                marker.position = position;
            }
        }

        for (const [driverId, marker] of markersRef.current) {
            if (!seen.has(driverId)) {
                marker.map = null;
                markersRef.current.delete(driverId);
            }
        }

        mapRef.current.fitBounds(bounds, 80);
    }, [positions]);

    if (!apiKey) {
        return (
            <div className="empty" style={{ height: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="empty__title">Map not configured</div>
                <p>Set VITE_GOOGLE_MAPS_API_KEY in frontend/.env to enable the live map. Driver positions are still tracked and listed alongside.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="empty" style={{ height: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="empty__title" style={{ color: 'var(--danger)' }}>Map failed to load</div>
                <p>{error}</p>
            </div>
        );
    }

    return <div ref={mapDivRef} style={{ width: '100%', height: 420, borderRadius: 8 }} />;
}
