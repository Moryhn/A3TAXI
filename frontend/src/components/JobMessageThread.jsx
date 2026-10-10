import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { formatDateTime } from '../lib/format.js';
import ConfirmDialog from './ConfirmDialog.jsx';

const POLL_MS = 10000;

// Free-form two-way SMS thread with the customer, scoped to one job —
// separate from QuickMessageSender's canned templates. Outbound rows are the
// driver typing here; inbound rows arrive via the SMS Gate webhook
// (backend/src/routes/smsGateWebhook.js) and show up on the next poll.
// canDelete adds an "erase conversation" button (driver view: completed jobs,
// and phone conversations). Pass `phone` instead of `jobId` for a
// conversation with a customer number typed in by hand, with no job behind it.
export default function JobMessageThread({ jobId, phone, canDelete = false }) {
    const { auth } = useAuth();
    const { t, lang } = useLanguage();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const bottomRef = useRef(null);
    const loadedOnce = useRef(false);

    const byPhone = phone != null;
    const conversationKey = byPhone ? `phone:${phone}` : `job:${jobId}`;
    const activeKey = useRef(conversationKey);
    activeKey.current = conversationKey;
    const apiCalls = byPhone
        ? {
            list: () => api.listPhoneMessages(auth.token, phone),
            send: (body) => api.sendPhoneMessage(auth.token, phone, body),
            remove: () => api.deletePhoneMessages(auth.token, phone),
        }
        : {
            list: () => api.listJobMessages(auth.token, jobId),
            send: (body) => api.sendJobMessage(auth.token, jobId, body),
            remove: () => api.deleteJobMessages(auth.token, jobId),
        };

    async function refresh() {
        const requestedKey = conversationKey;
        try {
            const rows = await apiCalls.list();
            // The driver may have switched number while this was in flight.
            if (activeKey.current === requestedKey) setMessages(rows);
        } catch {
            // Transient poll failure — keep showing the last known messages
            // rather than clearing the thread.
        } finally {
            loadedOnce.current = true;
        }
    }

    useEffect(() => {
        setMessages([]);
        setError('');
        refresh();
        const interval = setInterval(refresh, POLL_MS);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationKey]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: 'nearest' });
    }, [messages.length]);

    async function send() {
        const body = text.trim();
        if (!body) return;
        setSending(true);
        setError('');
        try {
            const saved = await apiCalls.send(body);
            setMessages((all) => [...all, saved]);
            setText('');
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    }

    async function confirmDelete() {
        setConfirmingDelete(false);
        setError('');
        try {
            await apiCalls.remove();
            setMessages([]);
        } catch (err) {
            setError(err.message);
        }
    }

    function onKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    maxHeight: 220,
                    overflowY: 'auto',
                    padding: '8px 4px',
                    background: 'var(--panel-2)',
                    borderRadius: 'var(--radius-md)',
                }}
            >
                {messages.length === 0 && loadedOnce.current && (
                    <p className="subtle" style={{ textAlign: 'center', fontSize: 12, padding: '6px 0' }}>
                        {t('driver.jobMessages.empty')}
                    </p>
                )}
                {messages.map((m) => (
                    <div
                        key={m.id}
                        style={{
                            alignSelf: m.direction === 'outbound' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            padding: '8px 12px',
                            borderRadius: 12,
                            fontSize: 13,
                            lineHeight: 1.4,
                            background: m.direction === 'outbound' ? 'var(--amber)' : 'var(--panel)',
                            color: m.direction === 'outbound' ? 'var(--amber-ink)' : 'var(--text)',
                            border: m.direction === 'outbound' ? 'none' : '1px solid var(--border)',
                        }}
                    >
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3, textAlign: m.direction === 'outbound' ? 'right' : 'left' }}>
                            {formatDateTime(m.created_at, lang, { timeStyle: 'short' })}
                            {m.status === 'failed' && ` · ${t('driver.jobMessages.failed')}`}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                    className="input"
                    rows={1}
                    style={{ flex: 1, resize: 'none' }}
                    placeholder={t('driver.jobMessages.placeholder')}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onKeyDown}
                    disabled={sending}
                />
                <button type="button" className="btn btn--primary" onClick={send} disabled={sending || !text.trim()}>
                    {sending ? t('driver.jobMessages.sending') : t('driver.jobMessages.send')}
                </button>
            </div>
            {error && <p className="subtle" style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</p>}

            {canDelete && messages.length > 0 && (
                <button type="button" className="btn btn--danger" style={{ width: '100%', fontSize: 12 }} onClick={() => setConfirmingDelete(true)}>
                    {t('driver.jobMessages.deleteThread')}
                </button>
            )}

            <ConfirmDialog
                open={confirmingDelete}
                title={t('driver.jobMessages.confirmDeleteTitle')}
                message={t(byPhone ? 'driver.jobMessages.confirmDeletePhoneMessage' : 'driver.jobMessages.confirmDeleteMessage')}
                confirmLabel={t('driver.jobMessages.deleteThread')}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmingDelete(false)}
            />
        </div>
    );
}
