import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../../lib/format.js';

const DURATION_MS = 500;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export default function MeterPanel({ value, lang, label, note }) {
    const [displayed, setDisplayed] = useState(value);
    const fromRef = useRef(value);
    const frameRef = useRef(null);

    useEffect(() => {
        if (value == null) return;
        const from = fromRef.current ?? value;
        const start = performance.now();

        function tick(now) {
            const t = Math.min(1, (now - start) / DURATION_MS);
            const eased = easeOutCubic(t);
            setDisplayed(from + (value - from) * eased);
            if (t < 1) {
                frameRef.current = requestAnimationFrame(tick);
            } else {
                fromRef.current = value;
            }
        }
        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    if (value == null) return null;

    return (
        <div className="meter-panel">
            <div className="meter-panel__label">{label}</div>
            <div className="meter-panel__value">{formatCurrency(displayed, lang)}</div>
            {note && <div className="meter-panel__note">{note}</div>}
        </div>
    );
}
