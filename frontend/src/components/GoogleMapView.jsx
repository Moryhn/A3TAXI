import { useEffect, useRef, useState } from 'react';
import { GOOGLE_MAPS_API_KEY as apiKey, loadGoogleMapsLibrary } from '../lib/googleMaps.js';
import { isStale } from '../lib/time.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

let loaderPromise = null;

function loadGoogleMaps() {
    if (!loaderPromise) {
        loaderPromise = Promise.all([
            loadGoogleMapsLibrary('maps'),
            loadGoogleMapsLibrary('marker'),
            loadGoogleMapsLibrary('core'),
        ]).then(([{ Map }, { AdvancedMarkerElement }, { LatLngBounds }]) => ({
            Map,
            AdvancedMarkerElement,
            LatLngBounds,
        }));
    }
    return loaderPromise;
}

function createMarkerContent(name, stale, lastSeenLabel) {
    const accent = stale ? '#8a8f98' : '#f5b700';

    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '3px';
    wrap.style.opacity = stale ? '0.65' : '1';

    const label = document.createElement('div');
    label.textContent = stale ? `${name} ${lastSeenLabel}` : name;
    label.style.background = '#1d2127';
    label.style.color = accent;
    label.style.fontFamily = "'IBM Plex Mono', ui-monospace, monospace";
    label.style.fontSize = '11px';
    label.style.fontWeight = '600';
    label.style.padding = '3px 7px';
    label.style.borderRadius = '4px';
    label.style.boxShadow = '0 1px 4px rgba(0,0,0,0.45)';
    label.style.whiteSpace = 'nowrap';

    const pin = document.createElement('div');
    pin.style.width = '14px';
    pin.style.height = '14px';
    pin.style.borderRadius = '50%';
    pin.style.background = accent;
    pin.style.border = '2px solid #1d2127';
    pin.style.boxShadow = '0 1px 4px rgba(0,0,0,0.45)';

    wrap.appendChild(label);
    wrap.appendChild(pin);
    return wrap;
}

// Renders driver positions as markers on a live Google Map.
// Falls back to a message if VITE_GOOGLE_MAPS_API_KEY isn't configured.
export default function GoogleMapView({ positions }) {
    const { t } = useLanguage();
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
        const lastSeenLabel = t('mapView.lastSeen');

        for (const p of positions) {
            seen.add(p.driver_id);
            const position = { lat: Number(p.lat), lng: Number(p.lng) };
            bounds.extend(position);

            const stale = isStale(p.recorded_at);
            let marker = markersRef.current.get(p.driver_id);
            if (!marker) {
                marker = new api.AdvancedMarkerElement({
                    map: mapRef.current,
                    position,
                    title: p.driver_name,
                    content: createMarkerContent(p.driver_name, stale, lastSeenLabel),
                });
                markersRef.current.set(p.driver_id, marker);
            } else {
                marker.position = position;
                marker.content = createMarkerContent(p.driver_name, stale, lastSeenLabel);
            }
        }

        for (const [driverId, marker] of markersRef.current) {
            if (!seen.has(driverId)) {
                marker.map = null;
                markersRef.current.delete(driverId);
            }
        }

        mapRef.current.fitBounds(bounds, 80);
    }, [positions, t]);

    if (!apiKey) {
        return (
            <div className="empty" style={{ height: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="empty__title">{t('mapView.notConfigTitle')}</div>
                <p>{t('mapView.notConfigBody')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="empty" style={{ height: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="empty__title" style={{ color: 'var(--danger)' }}>{t('mapView.failedTitle')}</div>
                <p>{error}</p>
            </div>
        );
    }

    return <div ref={mapDivRef} style={{ width: '100%', height: 420, borderRadius: 8 }} />;
}
