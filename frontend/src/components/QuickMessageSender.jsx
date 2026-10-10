import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import JobMessageThread from './JobMessageThread.jsx';
import { composeQuickMessage } from '../lib/quickMessage.js';

// One-tap canned SMS to a customer. Used both with a dispatch job attached
// (phone pre-filled, job recorded for traceability) and standalone, since
// drivers also pick up rides outside the app and still want to send the
// review link — the phone field stays editable either way. With showChat
// (the standalone, no-job panel) it also offers a free-text conversation with
// whatever number is typed, the same chat the driver gets on a job.
export default function QuickMessageSender({ phone: initialPhone = '', jobId = null, showChat = false }) {
    const { auth } = useAuth();
    const { t } = useLanguage();
    const [buttons, setButtons] = useState([]);
    const [phone, setPhone] = useState(initialPhone);
    const [chatOpen, setChatOpen] = useState(false);
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

    if (buttons.length === 0 && !showChat) return null;

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
                        // Fixed two-up width (no flex-grow) so a lone button
                        // left on the last row — any odd button count, e.g. 5 —
                        // stays the same size as the others instead of
                        // stretching to fill the whole row.
                        style={{ flex: '0 0 calc(50% - 4px)', padding: '12px 14px', fontSize: 13 }}
                        disabled={!phoneReady || sending}
                        onClick={() => setPending(b)}
                    >
                        {b.label || `#${b.position}`}
                    </button>
                ))}
            </div>

            {showChat && (
                <>
                    <button
                        type="button"
                        className="btn btn--ghost"
                        style={{ width: '100%' }}
                        disabled={!phoneReady}
                        onClick={() => setChatOpen((open) => !open)}
                    >
                        {t('driver.jobMessages.toggle')}
                    </button>
                    {chatOpen && phoneReady && <JobMessageThread phone={phone} canDelete />}
                </>
            )}

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
                message={pending ? composeQuickMessage(pending) : ''}
                confirmLabel={t('driver.quickMessages.confirmSend')}
                variant="primary"
                onConfirm={confirmSend}
                onCancel={() => setPending(null)}
            />
        </div>
    );
}
