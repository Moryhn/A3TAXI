import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatDateTime } from '../../lib/format.js';
import ToggleChip from '../../components/ToggleChip.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

function composePreview(draft) {
    return (draft.message_template || '').replaceAll('{lien}', draft.google_review_link || '');
}

export default function QuickMessages() {
    const { auth } = useAuth();
    const { t, lang } = useLanguage();
    const [drafts, setDrafts] = useState([]);
    const [logs, setLogs] = useState([]);
    const [savingPosition, setSavingPosition] = useState(null);
    const [adding, setAdding] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        api.listQuickMessageButtons(auth.token).then(setDrafts);
        api.listQuickMessageLogs(auth.token).then(setLogs);
    }, []);

    async function addButton() {
        setAdding(true);
        setStatus(null);
        try {
            const created = await api.createQuickMessageButton(auth.token);
            setDrafts((all) => [...all, created]);
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setAdding(false);
        }
    }

    async function confirmDelete() {
        const position = pendingDelete.position;
        setPendingDelete(null);
        setStatus(null);
        try {
            await api.deleteQuickMessageButton(auth.token, position);
            setDrafts((all) => all.filter((b) => b.position !== position));
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        }
    }

    function updateDraft(position, patch) {
        setDrafts((all) => all.map((b) => (b.position === position ? { ...b, ...patch } : b)));
    }

    async function save(draft) {
        setSavingPosition(draft.position);
        setStatus(null);
        try {
            const saved = await api.updateQuickMessageButton(auth.token, draft.position, {
                label: draft.label,
                messageTemplate: draft.message_template,
                googleReviewLink: draft.google_review_link,
                isActive: draft.is_active,
            });
            updateDraft(saved.position, saved);
            setStatus({ ok: true, message: t('admin.quickMessages.saved') });
        } catch (err) {
            setStatus({ ok: false, message: err.message });
        } finally {
            setSavingPosition(null);
        }
    }

    return (
        <div>
            <div className="page__head">
                <div>
                    <div className="eyebrow">{t('admin.quickMessages.eyebrow')}</div>
                    <h1 className="h1">{t('admin.quickMessages.title')}</h1>
                </div>
            </div>

            <p className="subtle" style={{ marginBottom: 20, maxWidth: 640, lineHeight: 1.6 }}>
                {t('admin.quickMessages.intro')}
            </p>

            {status && (
                <div
                    className="pill"
                    style={{
                        marginBottom: 16,
                        padding: '10px 14px',
                        color: status.ok ? '#0f8a5f' : 'var(--danger)',
                        background: status.ok ? 'rgba(52,211,153,0.15)' : 'rgba(240,85,76,0.12)',
                    }}
                >
                    {status.message}
                </div>
            )}

            <div className="dispatch-grid" style={{ marginBottom: 24 }}>
                {drafts.map((draft, index) => (
                    <div key={draft.position} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div className="eyebrow">{t('admin.quickMessages.buttonNumber', { n: index + 1 })}</div>
                            <ToggleChip
                                label={draft.is_active ? t('admin.quickMessages.active') : t('admin.quickMessages.inactive')}
                                checked={draft.is_active}
                                onChange={(v) => updateDraft(draft.position, { is_active: v })}
                            />
                        </div>

                        <div className="field" style={{ marginBottom: 10 }}>
                            <label>{t('admin.quickMessages.labelField')}</label>
                            <input
                                className="input"
                                maxLength={50}
                                placeholder={t('admin.quickMessages.labelPlaceholder')}
                                value={draft.label}
                                onChange={(e) => updateDraft(draft.position, { label: e.target.value })}
                            />
                        </div>

                        <div className="field" style={{ marginBottom: 10 }}>
                            <label>{t('admin.quickMessages.messageField')}</label>
                            <textarea
                                className="input"
                                rows={3}
                                placeholder={t('admin.quickMessages.messagePlaceholder')}
                                value={draft.message_template}
                                onChange={(e) => updateDraft(draft.position, { message_template: e.target.value })}
                            />
                            <div className="subtle" style={{ fontSize: 12, marginTop: 4 }}>{t('admin.quickMessages.placeholderHint')}</div>
                        </div>

                        <div className="field" style={{ marginBottom: 10 }}>
                            <label>{t('admin.quickMessages.linkField')}</label>
                            <input
                                className="input"
                                placeholder={t('admin.quickMessages.linkPlaceholder')}
                                value={draft.google_review_link}
                                onChange={(e) => updateDraft(draft.position, { google_review_link: e.target.value })}
                            />
                        </div>

                        <div className="field" style={{ marginBottom: 12 }}>
                            <label>{t('admin.quickMessages.previewLabel')}</label>
                            <div className="subtle" style={{ padding: '10px 12px', background: 'var(--panel-2)', borderRadius: 'var(--radius-md)', lineHeight: 1.5, whiteSpace: 'pre-wrap', minHeight: 44 }}>
                                {composePreview(draft) || t('admin.quickMessages.previewEmpty')}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => save(draft)}
                                className="btn btn--primary"
                                style={{ flex: 1 }}
                                disabled={savingPosition === draft.position}
                            >
                                {savingPosition === draft.position ? t('admin.quickMessages.saving') : t('common.save')}
                            </button>
                            <button
                                onClick={() => setPendingDelete(draft)}
                                className="btn btn--danger"
                                style={{ padding: '0 16px' }}
                            >
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={addButton}
                className="btn btn--ghost"
                style={{ marginBottom: 24 }}
                disabled={adding}
            >
                {adding ? t('admin.quickMessages.adding') : t('admin.quickMessages.addButton')}
            </button>

            <div className="card">
                <div className="eyebrow">{t('admin.quickMessages.historyEyebrow')}</div>
                {logs.length === 0 ? (
                    <p className="subtle" style={{ marginTop: 10 }}>{t('admin.quickMessages.noLogs')}</p>
                ) : (
                    <div className="table-wrap" style={{ marginTop: 10 }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('admin.quickMessages.colDate')}</th>
                                    <th>{t('admin.quickMessages.colDriver')}</th>
                                    <th>{t('admin.quickMessages.colPhone')}</th>
                                    <th>{t('admin.quickMessages.colJob')}</th>
                                    <th>{t('admin.quickMessages.colButton')}</th>
                                    <th>{t('admin.quickMessages.colStatus')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((l) => (
                                    <tr key={l.id}>
                                        <td className="subtle">{formatDateTime(l.sent_at, lang)}</td>
                                        <td>{l.driver_name}</td>
                                        <td>{l.customer_phone}</td>
                                        <td className="subtle">{l.job_address || t('admin.quickMessages.manualSend')}</td>
                                        <td>{l.button_label}</td>
                                        <td>
                                            <span className={`pill pill--${l.status === 'sent' ? 'confirmed' : 'cancelled'}`}>
                                                {l.status === 'sent' ? t('admin.quickMessages.statusSent') : t('admin.quickMessages.statusFailed')}
                                            </span>
                                            {l.error && <div className="subtle" style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{l.error}</div>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={!!pendingDelete}
                title={t('admin.quickMessages.confirmDeleteTitle')}
                message={pendingDelete ? t('admin.quickMessages.confirmDeleteMessage', { label: pendingDelete.label || `#${pendingDelete.position}` }) : ''}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
