import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const HANDLE_SIZE = 26;
const MIN_CROP = 40;

function rotateImageFile(file) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = img.height;
            canvas.height = img.width;
            const ctx = canvas.getContext('2d');
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            canvas.toBlob((blob) => {
                resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.92);
        };
        img.src = url;
    });
}

// Full-screen crop/rotate step shown right after a receipt photo is picked —
// lets the driver frame just the receipt (phone camera photos usually
// include a lot of surrounding table/dashboard) before it's compressed and
// uploaded, similar to a document-scanner app's crop step.
export default function PhotoCropModal({ file, onCancel, onConfirm }) {
    const { t } = useLanguage();
    const [workingFile, setWorkingFile] = useState(file);
    const [imgUrl, setImgUrl] = useState(null);
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
    const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
    const [crop, setCrop] = useState(null);
    const [busy, setBusy] = useState(false);
    const imgRef = useRef(null);
    const dragRef = useRef(null);

    useEffect(() => {
        const url = URL.createObjectURL(workingFile);
        setImgUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [workingFile]);

    useEffect(() => {
        function onKeyDown(e) {
            if (e.key === 'Escape') onCancel();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onCancel]);

    function handleImgLoad() {
        const img = imgRef.current;
        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        const dispW = img.clientWidth, dispH = img.clientHeight;
        setDisplaySize({ w: dispW, h: dispH });
        const insetX = dispW * 0.08, insetY = dispH * 0.08;
        setCrop({ x: insetX, y: insetY, w: dispW - insetX * 2, h: dispH - insetY * 2 });
    }

    const clampCrop = useCallback((c) => {
        let { x, y, w, h } = c;
        w = Math.max(MIN_CROP, Math.min(w, displaySize.w));
        h = Math.max(MIN_CROP, Math.min(h, displaySize.h));
        x = Math.max(0, Math.min(x, displaySize.w - w));
        y = Math.max(0, Math.min(y, displaySize.h - h));
        return { x, y, w, h };
    }, [displaySize]);

    function beginDrag(mode) {
        return (e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startCrop: crop };
        };
    }

    function onPointerMove(e) {
        if (!dragRef.current || !crop) return;
        const { mode, startX, startY, startCrop } = dragRef.current;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        const next = { ...startCrop };
        if (mode === 'move') {
            next.x = startCrop.x + dx;
            next.y = startCrop.y + dy;
        } else if (mode === 'nw') {
            next.x = startCrop.x + dx; next.y = startCrop.y + dy;
            next.w = startCrop.w - dx; next.h = startCrop.h - dy;
        } else if (mode === 'ne') {
            next.y = startCrop.y + dy;
            next.w = startCrop.w + dx; next.h = startCrop.h - dy;
        } else if (mode === 'sw') {
            next.x = startCrop.x + dx;
            next.w = startCrop.w - dx; next.h = startCrop.h + dy;
        } else if (mode === 'se') {
            next.w = startCrop.w + dx; next.h = startCrop.h + dy;
        }
        setCrop(clampCrop(next));
    }

    function onPointerUp() {
        dragRef.current = null;
    }

    async function handleRotate() {
        setBusy(true);
        const rotated = await rotateImageFile(workingFile);
        setWorkingFile(rotated);
        setCrop(null);
        setBusy(false);
    }

    function handleConfirm() {
        if (!crop || !naturalSize.w) return;
        setBusy(true);
        const scaleX = naturalSize.w / displaySize.w;
        const scaleY = naturalSize.h / displaySize.h;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(crop.w * scaleX);
        canvas.height = Math.round(crop.h * scaleY);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
            imgRef.current,
            crop.x * scaleX, crop.y * scaleY, crop.w * scaleX, crop.h * scaleY,
            0, 0, canvas.width, canvas.height
        );
        canvas.toBlob((blob) => {
            setBusy(false);
            if (!blob) return onCancel();
            onConfirm(new File([blob], workingFile.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.92);
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
            <div
                style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', padding: 16 }}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
            >
                {imgUrl && (
                    <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
                        <img
                            ref={imgRef}
                            src={imgUrl}
                            onLoad={handleImgLoad}
                            alt=""
                            draggable={false}
                            style={{ display: 'block', maxWidth: '100%', maxHeight: '68vh', userSelect: 'none' }}
                        />
                        {crop && (
                            <>
                                <div
                                    onPointerDown={beginDrag('move')}
                                    style={{
                                        position: 'absolute', left: crop.x, top: crop.y, width: crop.w, height: crop.h,
                                        border: '2px solid var(--amber)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
                                        cursor: 'move', touchAction: 'none',
                                    }}
                                />
                                {['nw', 'ne', 'sw', 'se'].map((corner) => {
                                    const cx = corner.includes('w') ? crop.x : crop.x + crop.w;
                                    const cy = corner.includes('n') ? crop.y : crop.y + crop.h;
                                    return (
                                        <div
                                            key={corner}
                                            onPointerDown={beginDrag(corner)}
                                            style={{
                                                position: 'absolute', left: cx - HANDLE_SIZE / 2, top: cy - HANDLE_SIZE / 2,
                                                width: HANDLE_SIZE, height: HANDLE_SIZE, borderRadius: '50%',
                                                background: 'var(--amber)', border: '2px solid #111',
                                                touchAction: 'none', cursor: `${corner}-resize`,
                                            }}
                                        />
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--ink)' }}>
                <p className="subtle" style={{ textAlign: 'center', margin: 0, color: '#ccc' }}>{t('driver.photoCrop.hint')}</p>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={handleRotate} disabled={busy}>{t('driver.photoCrop.rotate')}</button>
                    <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>{t('common.cancel')}</button>
                    <button type="button" className="btn btn--primary" style={{ flex: 1 }} onClick={handleConfirm} disabled={busy || !crop}>
                        {busy ? t('driver.photoCrop.processing') : t('driver.photoCrop.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
