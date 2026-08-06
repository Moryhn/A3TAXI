import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { compressImage } from '../lib/image.js';
import PhotoCropModal from './PhotoCropModal.jsx';

// Two explicit inputs (camera / gallery) instead of one bare
// <input type="file" accept="image/*">. That used to be enough to let the
// OS's own picker offer both — true on iOS Safari, but modern Android
// (13+) now routes a plain accept="image/*" input straight to its separate
// system Photo Picker, which has no "take a photo" option at all. A driver
// on Android could never reach the camera that way. Giving camera and
// gallery their own buttons/inputs guarantees each reaches its target on
// both platforms.
export default function ReceiptPhotoField({ onChange }) {
    const { t } = useLanguage();
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);
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
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePick} style={{ display: 'none' }} />
            <input ref={galleryInputRef} type="file" accept="image/*" onChange={handlePick} style={{ display: 'none' }} />

            {previewUrl && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                    <img src={previewUrl} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }} />
                    <span className="subtle" style={{ flex: 1, fontSize: 13 }}>{t('driver.photoCrop.photoAttached')}</span>
                    <button type="button" className="btn btn--ghost" style={{ padding: '10px 14px' }} onClick={handleRemove} disabled={processing}>
                        {t('common.cancel')}
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn--ghost" style={{ flex: 1, padding: previewUrl ? '10px 12px' : 14, fontSize: previewUrl ? 13 : undefined }} onClick={() => cameraInputRef.current.click()} disabled={processing}>
                    {processing ? t('driver.tripEntry.processingPhoto') : t('driver.photoCrop.takePhoto')}
                </button>
                <button type="button" className="btn btn--ghost" style={{ flex: 1, padding: previewUrl ? '10px 12px' : 14, fontSize: previewUrl ? 13 : undefined }} onClick={() => galleryInputRef.current.click()} disabled={processing}>
                    {processing ? t('driver.tripEntry.processingPhoto') : t('driver.photoCrop.chooseFromGallery')}
                </button>
            </div>

            {pendingFile && (
                <PhotoCropModal file={pendingFile} onConfirm={handleCropConfirm} onCancel={() => setPendingFile(null)} />
            )}
        </div>
    );
}
