import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { compressImage } from '../lib/image.js';
import PhotoCropModal from './PhotoCropModal.jsx';

// Replaces a bare <input type="file" capture="environment">, which forces
// the camera open directly and skips the OS's own picker — on mobile that
// picker is what offers "Photo Library" / "Choose File" (document scanner
// included on iOS) alongside the camera. Dropping `capture` restores that
// choice, and the crop step after gives a consistent way to frame/rotate the
// receipt regardless of which source the driver picked.
export default function ReceiptPhotoField({ onChange }) {
    const { t } = useLanguage();
    const inputRef = useRef(null);
    const [pendingFile, setPendingFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

    function handlePick(e) {
        const file = e.target.files[0];
        e.target.value = '';
        if (file) setPendingFile(file);
    }

    async function handleCropConfirm(croppedFile) {
        setPendingFile(null);
        setProcessing(true);
        const final = await compressImage(croppedFile);
        setProcessing(false);
        setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(final);
        });
        onChange(final);
    }

    function handleRemove() {
        setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        onChange(null);
    }

    return (
        <div>
            <input ref={inputRef} type="file" accept="image/*" onChange={handlePick} style={{ display: 'none' }} />
            {previewUrl ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <img src={previewUrl} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }} />
                    <button type="button" className="btn btn--ghost" style={{ flex: 1, padding: '10px 14px' }} onClick={() => inputRef.current.click()} disabled={processing}>
                        {t('driver.photoCrop.change')}
                    </button>
                    <button type="button" className="btn btn--ghost" style={{ padding: '10px 14px' }} onClick={handleRemove} disabled={processing}>
                        {t('common.cancel')}
                    </button>
                </div>
            ) : (
                <button type="button" className="btn btn--ghost" style={{ width: '100%', padding: 14 }} onClick={() => inputRef.current.click()} disabled={processing}>
                    {processing ? t('driver.tripEntry.processingPhoto') : t('driver.photoCrop.choosePhoto')}
                </button>
            )}

            {pendingFile && (
                <PhotoCropModal file={pendingFile} onConfirm={handleCropConfirm} onCancel={() => setPendingFile(null)} />
            )}
        </div>
    );
}
