import { useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }) {
    const { t } = useLanguage();
    const cancelRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        cancelRef.current?.focus();

        function onKeyDown(e) {
            if (e.key === 'Escape') onCancel();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
            }}
            onClick={onCancel}
        >
            <div
                className="card"
                style={{ maxWidth: 360, width: '100%' }}
                onClick={(e) => e.stopPropagation()}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
            >
                <div className="eyebrow" style={{ color: 'var(--danger)' }}>{t('common.confirm')}</div>
                <div id="confirm-dialog-title" style={{ fontWeight: 600, fontSize: 17, margin: '8px 0' }}>{title}</div>
                {message && <p className="subtle" style={{ marginBottom: 20, lineHeight: 1.5 }}>{message}</p>}
                <div style={{ display: 'flex', gap: 10, marginTop: message ? 0 : 16 }}>
                    <button ref={cancelRef} onClick={onCancel} className="btn btn--ghost" style={{ flex: 1 }}>{t('common.cancel')}</button>
                    <button onClick={onConfirm} className="btn btn--danger" style={{ flex: 1 }}>{confirmLabel || t('common.delete')}</button>
                </div>
            </div>
        </div>
    );
}
