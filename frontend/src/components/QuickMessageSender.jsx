import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

function composeMessage(button) {
    return (button.message_template || '').replaceAll('{lien}', button.google_review_link || '');
}

// One-tap canned SMS to a customer. Used both with a dispatch job attached
// (phone pre-filled, job recorded for traceability) and standalone, since
// drivers also pick up rides outside the app and still want to send the
// review link — the phone field stays editable either way.
export default function QuickMessageSender({ phone: initialPhone = '', jobId = null }) {
    const { auth } = useAuth();
    const { t } = useLanguage();
    const [buttons, setButtons] = useState([]);
    const [phone, setPhone] = useState(initialPhone);
    const [pending, setPending] = useState(null);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        api.listQuickMessageButtons(auth.token)
            .then((all) => setButtons(all.filter((b) => b.is_active)))
            .catch(() => {});
    }, []);

    async function confirmSend() {
        const button = pending;
        setPending(null);
        setSending(true);
        setStatus(null);
        try {
            await api.sendQuickMessage(auth.token, { phone, position: button.position, jobId });
            setStatus({ ok: true, message: t('driver.quickMessages.sent') });
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setSending(false);
        }
    }

    if (buttons.length === 0) return null;

    const phoneReady = phone.replace(/\D/g, '').length >= 10;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="field">
                <label>{t('driver.quickMessages.phoneLabel')}</label>
                <input
                    className="input"
                    type="tel"
                    inputMode="tel"
                    placeholder={t('driver.quickMessages.phonePlaceholder')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {buttons.map((b) => (
                    <button
                        key={b.position}
                        type="button"
                        className="btn btn--ghost"
                        style={{ flex: '1 1 45%', padding: '12px 14px', fontSize: 13 }}
                        disabled={!phoneReady || sending}
                        onClick={() => setPending(b)}
                    >
                        {b.label || `#${b.position}`}
                    </button>
                ))}
            </div>

            {status && (
                <div
                    className="pill"
                    style={{
                        justifyContent: 'center',
                        padding: '10px 14px',
                        color: status.ok ? '#0f8a5f' : 'var(--danger)',
                        background: status.ok ? 'rgba(52,211,153,0.15)' : 'rgba(240,85,76,0.12)',
                    }}
                >
                    {status.message}
                </div>
            )}

            <ConfirmDialog
                open={!!pending}
                title={t('driver.quickMessages.confirmTitle', { phone })}
                message={pending ? composeMessage(pending) : ''}
                confirmLabel={t('driver.quickMessages.confirmSend')}
                variant="primary"
                onConfirm={confirmSend}
                onCancel={() => setPending(null)}
            />
        </div>
    );
}
