export default function Stepper({ label, value, onChange, min = 0, max = 99 }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                    type="button"
                    className="btn btn--ghost"
                    style={{ width: 32, height: 32, padding: 0, fontSize: 16, lineHeight: 1 }}
                    onClick={() => onChange(Math.max(min, value - 1))}
                    disabled={value <= min}
                >
                    −
                </button>
                <span style={{ minWidth: 20, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{value}</span>
                <button
                    type="button"
                    className="btn btn--ghost"
                    style={{ width: 32, height: 32, padding: 0, fontSize: 16, lineHeight: 1 }}
                    onClick={() => onChange(Math.min(max, value + 1))}
                    disabled={value >= max}
                >
                    +
                </button>
            </div>
        </div>
    );
}
