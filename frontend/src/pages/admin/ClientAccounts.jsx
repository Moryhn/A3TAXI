import { Fragment, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

const EMPTY_TEMPLATE_FORM = {
    name: '', clientNameCell: '', periodCell: '', tripRowStart: '',
    dateCol: '', descriptionCol: '', departureCol: '', arrivalCol: '', amountCol: '',
};

export default function ClientAccounts() {
    const { auth } = useAuth();
    const { t } = useLanguage();
    const [accounts, setAccounts] = useState([]);
    const [form, setForm] = useState({
        name: '', code: '', contactPhone: '', address: '', city: '', postalCode: '', invoiceDescription: '',
    });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '', contactPhone: '', address: '', city: '', postalCode: '', invoiceDescription: '',
    });
    const [pendingDelete, setPendingDelete] = useState(null);

    const [activeTemplate, setActiveTemplate] = useState(null);
    const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE_FORM);
    const [templateFile, setTemplateFile] = useState(null);
    const [uploadingTemplate, setUploadingTemplate] = useState(false);
    const [templateError, setTemplateError] = useState('');

    async function refresh() {
        setAccounts(await api.listClientAccounts(auth.token));
    }

    useEffect(() => { refresh(); }, []);

    async function handleCreate(e) {
        e.preventDefault();
        await api.createClientAccount(auth.token, form);
        setForm({ name: '', code: '', contactPhone: '', address: '', city: '', postalCode: '', invoiceDescription: '' });
        refresh();
    }

    function startEdit(a) {
        setEditingId(a.id);
        setEditForm({
            name: a.name,
            contactPhone: a.contact_phone || '',
            address: a.address || '',
            city: a.city || '',
            postalCode: a.postal_code || '',
            invoiceDescription: a.invoice_description || '',
        });
        setTemplateForm(EMPTY_TEMPLATE_FORM);
        setTemplateFile(null);
        setTemplateError('');
        setActiveTemplate(null);
        api.getClientTemplate(auth.token, a.id).then((res) => setActiveTemplate(res.active));
    }

    async function uploadTemplate(clientAccountId) {
        setTemplateError('');
        if (!templateFile) {
            setTemplateError(t('admin.clients.template.fileRequired'));
            return;
        }
        const fieldMapping = {
            client_name: templateForm.clientNameCell || undefined,
            period: templateForm.periodCell || undefined,
            trip_row_start: Number(templateForm.tripRowStart),
            trip_columns: {
                date: templateForm.dateCol,
                description: templateForm.descriptionCol,
                departure: templateForm.departureCol,
                arrival: templateForm.arrivalCol,
                amount: templateForm.amountCol,
            },
        };
        const body = new FormData();
        body.append('file', templateFile);
        body.append('name', templateForm.name || templateFile.name);
        body.append('fieldMapping', JSON.stringify(fieldMapping));

        setUploadingTemplate(true);
        try {
            const created = await api.uploadClientTemplate(auth.token, clientAccountId, body);
            setActiveTemplate(created);
            setTemplateForm(EMPTY_TEMPLATE_FORM);
            setTemplateFile(null);
        } catch (err) {
            setTemplateError(err.message);
        } finally {
            setUploadingTemplate(false);
        }
    }

    async function saveEdit(id) {
        await api.updateClientAccount(auth.token, id, editForm);
        setEditingId(null);
        refresh();
    }

    async function confirmDelete() {
        await api.deleteClientAccount(auth.token, pendingDelete.id);
        setPendingDelete(null);
        refresh();
    }

    return (
        <div>
            <div className="page__head">
                <div>
                    <div className="eyebrow">{t('admin.clients.eyebrow')}</div>
                    <h1 className="h1">{t('admin.clients.title')}</h1>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="eyebrow">{t('admin.clients.addEyebrow')}</div>
                <form onSubmit={handleCreate} className="form-row" style={{ marginTop: 10 }}>
                    <div className="field">
                        <label>{t('admin.clients.nameLabel')}</label>
                        <input className="input" placeholder="Acme Logistics" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label>{t('admin.clients.codeLabel')}</label>
                        <input className="input" style={{ fontFamily: 'var(--font-mono)' }} placeholder="ACME" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                    </div>
                    <div className="field">
                        <label>{t('admin.clients.phoneLabel')}</label>
                        <input className="input" type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
                    </div>
                    <div className="field">
                        <label>{t('admin.clients.addressLabel')}</label>
                        <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="field">
                        <label>{t('admin.clients.cityLabel')}</label>
                        <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </div>
                    <div className="field">
                        <label>{t('admin.clients.postalCodeLabel')}</label>
                        <input className="input" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
                    </div>
                    <div className="field">
                        <label>{t('admin.clients.invoiceDescriptionLabel')}</label>
                        <input className="input" placeholder="Livraison" value={form.invoiceDescription} onChange={(e) => setForm({ ...form, invoiceDescription: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn--primary">{t('admin.clients.addClientBtn')}</button>
                </form>
            </div>

            {accounts.length === 0 ? (
                <div className="card empty">
                    <div className="empty__title">{t('admin.clients.emptyTitle')}</div>
                    <p>{t('admin.clients.emptyBody')}</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>{t('admin.clients.colCode')}</th><th>{t('admin.clients.colName')}</th><th>{t('admin.clients.colActions')}</th></tr></thead>
                        <tbody>
                            {accounts.map((a) => (
                                <Fragment key={a.id}>
                                    <tr>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{a.code}</td>
                                        {editingId === a.id ? (
                                            <>
                                                <td><input className="input" style={{ padding: '6px 10px' }} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button onClick={() => saveEdit(a.id)} className="btn btn--primary" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.save')}</button>
                                                        <button onClick={() => setEditingId(null)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.cancel')}</button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{a.name}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button onClick={() => startEdit(a)} className="btn btn--ghost" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.edit')}</button>
                                                        <button onClick={() => setPendingDelete(a)} className="btn btn--danger" style={{ padding: '6px 12px', fontSize: 12 }}>{t('common.delete')}</button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                    {editingId === a.id && (
                                        <tr>
                                            <td colSpan={3}>
                                                <div className="form-row">
                                                    <div className="field">
                                                        <label>{t('admin.clients.phoneLabel')}</label>
                                                        <input className="input" type="tel" value={editForm.contactPhone} onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })} />
                                                    </div>
                                                    <div className="field">
                                                        <label>{t('admin.clients.addressLabel')}</label>
                                                        <input className="input" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                                                    </div>
                                                    <div className="field">
                                                        <label>{t('admin.clients.cityLabel')}</label>
                                                        <input className="input" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                                                    </div>
                                                    <div className="field">
                                                        <label>{t('admin.clients.postalCodeLabel')}</label>
                                                        <input className="input" value={editForm.postalCode} onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })} />
                                                    </div>
                                                    <div className="field">
                                                        <label>{t('admin.clients.invoiceDescriptionLabel')}</label>
                                                        <input className="input" placeholder="Livraison" value={editForm.invoiceDescription} onChange={(e) => setEditForm({ ...editForm, invoiceDescription: e.target.value })} />
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                                                    <div className="eyebrow">{t('admin.clients.template.eyebrow')}</div>
                                                    {activeTemplate && (
                                                        <p className="subtle" style={{ marginTop: 6 }}>
                                                            {t('admin.clients.template.current', { name: activeTemplate.name })}
                                                        </p>
                                                    )}
                                                    <p className="subtle" style={{ marginTop: activeTemplate ? 2 : 6, fontSize: 12 }}>
                                                        {t('admin.clients.template.hint')}
                                                    </p>

                                                    <div className="form-row" style={{ marginTop: 12 }}>
                                                        <div className="field">
                                                            <label>{t('admin.clients.template.fileLabel')}</label>
                                                            <input className="input" type="file" accept=".xlsx" onChange={(e) => setTemplateFile(e.target.files[0] || null)} />
                                                        </div>
                                                        <div className="field">
                                                            <label>{t('admin.clients.template.nameLabel')}</label>
                                                            <input className="input" placeholder="Facture standard" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} />
                                                        </div>
                                                        <div className="field">
                                                            <label>{t('admin.clients.template.clientNameCellLabel')}</label>
                                                            <input className="input" style={{ fontFamily: 'var(--font-mono)' }} placeholder="B10" value={templateForm.clientNameCell} onChange={(e) => setTemplateForm({ ...templateForm, clientNameCell: e.target.value.toUpperCase() })} />
                                                        </div>
                                                        <div className="field">
                                                            <label>{t('admin.clients.template.periodCellLabel')}</label>
                                                            <input className="input" style={{ fontFamily: 'var(--font-mono)' }} placeholder="B4" value={templateForm.periodCell} onChange={(e) => setTemplateForm({ ...templateForm, periodCell: e.target.value.toUpperCase() })} />
                                                        </div>
                                                        <div className="field">
                                                            <label>{t('admin.clients.template.tripRowStartLabel')}</label>
                                                            <input className="input" type="number" min="1" style={{ fontFamily: 'var(--font-mono)' }} placeholder="12" value={templateForm.tripRowStart} onChange={(e) => setTemplateForm({ ...templateForm, tripRowStart: e.target.value })} />
                                                        </div>
                                                        <div className="field">
                                                            <label>{t('admin.clients.template.dateColLabel')}</label>
                                                            <input className="input" style={{ fontFamily: 'var(--font-mono)', width: 60 }} placeholder="A" value={templateForm.dateCol} onChange={(e) => setTemplateForm({ ...templateForm, dateCol: e.target.value.toUpperCase() })} />
                                                        </div>
                                                        <div className="field">
                                                            <label>{t('admin.clients.template.descriptionColLabel')}</label>
                                                            <input className="input" style={{ fontFamily: 'var(--font-mono)', width: 60 }} placeholder="B" value={templateForm.descriptionCol} onChange={(e) => setTemplateForm({ ...templateForm, descriptionCol: e.target.value.toUpperCase() })} />
                                                        </div>
                                                        <div className="field">
                                                            <label>{t('admin.clients.template.departureColLabel')}</label>
                                                            <input className="input" style={{ fontFamily: 'var(--font-mono)', width: 60 }} placeholder="C" value={templateForm.departureCol} onChange={(e) => setTemplateForm({ ...templateForm, departureCol: e.target.value.toUpperCase() })} />
                                                        </div>
                                                        <div className="field">
                                                            <label>{t('admin.clients.template.arrivalColLabel')}</label>
                                                            <input className="input" style={{ fontFamily: 'var(--font-mono)', width: 60 }} placeholder="D" value={templateForm.arrivalCol} onChange={(e) => setTemplateForm({ ...templateForm, arrivalCol: e.target.value.toUpperCase() })} />
                                                        </div>
                                                        <div className="field">
                                                            <label>{t('admin.clients.template.amountColLabel')}</label>
                                                            <input className="input" style={{ fontFamily: 'var(--font-mono)', width: 60 }} placeholder="E" value={templateForm.amountCol} onChange={(e) => setTemplateForm({ ...templateForm, amountCol: e.target.value.toUpperCase() })} />
                                                        </div>
                                                    </div>
                                                    {templateError && <p style={{ color: 'var(--danger, #dc2626)', marginTop: 8, fontSize: 13 }}>{templateError}</p>}
                                                    <button onClick={() => uploadTemplate(a.id)} className="btn btn--ghost" style={{ marginTop: 10 }} disabled={uploadingTemplate}>
                                                        {uploadingTemplate ? t('common.save') + '…' : t('admin.clients.template.uploadBtn')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                open={!!pendingDelete}
                title={t('admin.clients.confirmDeleteTitle', { name: pendingDelete?.name })}
                message={t('admin.clients.confirmDeleteMessage')}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
