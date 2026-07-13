import { useSpeechToText } from '../hooks/useSpeechToText.js';

// Small round mic button meant to sit beside a text input so drivers/admins
// can dictate instead of typing on a small phone screen in a car. Renders
// nothing when the browser has no SpeechRecognition support (e.g. iOS
// Safari), since those users already get a mic key on their native keyboard.
export default function MicButton({ lang = 'en-US', onResult, title = 'Speak' }) {
    const { isSupported, isListening, start, stop } = useSpeechToText(lang);

    if (!isSupported) return null;

    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={isListening}
            onClick={() => (isListening ? stop() : start(onResult))}
            className={`mic-btn${isListening ? ' mic-btn--listening' : ''}`}
        >
            🎤
        </button>
    );
}
