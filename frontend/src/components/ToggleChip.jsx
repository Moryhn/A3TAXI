import { Check } from 'lucide-react';

export default function ToggleChip({ label, checked, onChange }) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            className={`toggle-chip ${checked ? 'toggle-chip--active' : ''}`}
            onClick={() => onChange(!checked)}
        >
            <span className="toggle-chip__box">{checked && <Check size={11} strokeWidth={3} />}</span>
            {label}
        </button>
    );
}
