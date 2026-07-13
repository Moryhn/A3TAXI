import { useCallback, useRef, useState } from 'react';

const SpeechRecognitionImpl = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

// Wraps the browser's native Web Speech API (Chrome/Android). Not supported
// on iOS Safari — those users already get a mic key on the native keyboard,
// so useSpeechToText/MicButton simply hide themselves there via isSupported.
export function useSpeechToText(lang = 'en-US') {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    const start = useCallback((onResult) => {
        if (!SpeechRecognitionImpl) return;
        const recognition = new SpeechRecognitionImpl();
        recognition.lang = lang;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (e) => {
            onResult(e.results[0][0].transcript);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
        setIsListening(true);
        recognition.start();
    }, [lang]);

    const stop = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    return { isSupported: !!SpeechRecognitionImpl, isListening, start, stop };
}
