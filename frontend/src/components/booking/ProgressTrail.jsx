import { Check } from 'lucide-react';

export default function ProgressTrail({ steps, currentIndex }) {
    return (
        <div className="wizard__trail" role="list" aria-label="Booking progress">
            {steps.map((step, i) => (
                <div key={step.key} className="wizard__trail-item" role="listitem">
                    <div className="wizard__node-wrap">
                        <div
                            className={`wizard__node ${i < currentIndex ? 'wizard__node--done' : ''} ${i === currentIndex ? 'wizard__node--current' : ''}`}
                            aria-current={i === currentIndex ? 'step' : undefined}
                        >
                            {i < currentIndex ? <Check size={14} /> : i + 1}
                        </div>
                        <span className="wizard__node-label">{step.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`wizard__connector ${i < currentIndex ? 'wizard__connector--done' : ''}`} />
                    )}
                </div>
            ))}
        </div>
    );
}
