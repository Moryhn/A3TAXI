import { useEffect, useRef, useState } from 'react';
import { GOOGLE_MAPS_API_KEY, loadGoogleMapsLibrary } from '../lib/googleMaps.js';

// A3TAXI operates in and around Montreal but also runs cross-border US
// trips, so this only biases ranking toward Montreal (soft preference) and
// restricts results to Canada + US (hard filter) — not a tight radius cutoff.
const SERVICE_AREA_CENTER = { lat: 45.5017, lng: -73.5673 };
const SERVICE_AREA_RADIUS_METERS = 50000;

// A plain text input with an address-suggestion dropdown, built on the
// current (non-legacy) Places API. onChange always fires on every keystroke,
// so the field stays fully usable even if the API key/library never loads.
export default function PlaceAutocompleteInput({ id, name, className, style, placeholder, value, onChange, required }) {
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const placesRef = useRef(null);
    const sessionTokenRef = useRef(null);
    const debounceRef = useRef(null);
    const wrapRef = useRef(null);

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) return;
        let cancelled = false;
        loadGoogleMapsLibrary('places').then((places) => {
            if (!cancelled) placesRef.current = places;
        }).catch(() => {});
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        function onDocMouseDown(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, []);

    function handleChange(text) {
        onChange(text);
        setHighlighted(-1);
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!text || !placesRef.current) {
            setSuggestions([]);
            setOpen(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            try {
                if (!sessionTokenRef.current) {
                    sessionTokenRef.current = new placesRef.current.AutocompleteSessionToken();
                }
                const { suggestions: results } = await placesRef.current.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                    input: text,
                    sessionToken: sessionTokenRef.current,
                    locationBias: { center: SERVICE_AREA_CENTER, radius: SERVICE_AREA_RADIUS_METERS },
                    includedRegionCodes: ['ca', 'us'],
                });
                setSuggestions(results || []);
                setOpen((results || []).length > 0);
            } catch {
                setSuggestions([]);
                setOpen(false);
            }
        }, 250);
    }

    function selectSuggestion(suggestion) {
        onChange(suggestion.placePrediction.text.text);
        setSuggestions([]);
        setOpen(false);
        sessionTokenRef.current = null;
    }

    function handleKeyDown(e) {
        if (!open || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
        } else if (e.key === 'Enter' && highlighted >= 0) {
            e.preventDefault();
            selectSuggestion(suggestions[highlighted]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    }

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            <input
                id={id}
                name={name}
                className={className}
                style={style}
                placeholder={placeholder}
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setOpen(true)}
                required={required}
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-autocomplete="list"
            />
            {open && suggestions.length > 0 && (
                <div
                    className="card"
                    role="listbox"
                    style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, padding: 4, zIndex: 50, maxHeight: 240, overflowY: 'auto' }}
                >
                    {suggestions.map((s, i) => (
                        <div
                            key={s.placePrediction.placeId}
                            role="option"
                            aria-selected={highlighted === i}
                            onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                            onMouseEnter={() => setHighlighted(i)}
                            style={{
                                padding: '8px 10px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                background: highlighted === i ? 'var(--chip-bg)' : 'transparent',
                                fontSize: 14,
                            }}
                        >
                            {s.placePrediction.text.text}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
