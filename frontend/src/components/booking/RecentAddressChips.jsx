import { getRecentAddresses } from '../../lib/recentAddresses.js';

export default function RecentAddressChips({ value, onSelect, label }) {
    const recents = getRecentAddresses();
    if (value || recents.length === 0) return null;

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <span className="subtle" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            {recents.map((address) => (
                <button
                    key={address}
                    type="button"
                    className="pill"
                    style={{ background: 'var(--panel-2)', color: 'var(--text-muted)', cursor: 'pointer', border: 'none', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    onClick={() => onSelect(address)}
                >
                    {address}
                </button>
            ))}
        </div>
    );
}
