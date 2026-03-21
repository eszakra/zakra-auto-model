import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { X, Loader2, Camera, PersonStanding } from 'lucide-react';

interface ModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ModelModal: React.FC<ModelModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const { isEnabled } = useFeatureFlags();
    const [nombre, setNombre] = useState('');
    const [faceImages, setFaceImages] = useState<string[]>([]);
    const [bodyImages, setBodyImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const dataUrlToBlob = (dataUrl: string): Blob => {
        const [header, base64] = dataUrl.split(',');
        const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    };

    const uploadToStorage = async (dataUrl: string, prefix: string): Promise<string> => {
        const blob = dataUrlToBlob(dataUrl);
        const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
        const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { error } = await supabase.storage.from('models').upload(fileName, blob, { contentType: blob.type });
        if (error) throw new Error("Upload failed: " + error.message);
        return supabase.storage.from('models').getPublicUrl(fileName).data.publicUrl;
    };

    const readFile = (file: File): Promise<string> =>
        new Promise((res, rej) => {
            const r = new FileReader();
            r.onloadend = () => res(r.result as string);
            r.onerror = rej;
            r.readAsDataURL(file);
        });

    const handleSubmit = async () => {
        if (isEnabled('admin_only_generation') && !user?.is_admin) {
            alert("MAINTENANCE MODE: Uploading new models is currently restricted to Admins only.");
            return;
        }

        if (!nombre.trim()) { alert("Enter a model name."); return; }
        if (faceImages.length === 0) { alert("Upload at least one face photo."); return; }
        if (bodyImages.length === 0) { alert("Upload at least one body photo."); return; }

        setLoading(true);
        try {
            const prefix = nombre.trim().replace(/\s+/g, '_');
            
            // Upload all face images
            const faceUrlPromises = faceImages.map((img, i) => 
                img.startsWith('data:') ? uploadToStorage(img, `${prefix}_face_${i}`) : Promise.resolve(img)
            );
            const bodyUrlPromises = bodyImages.map((img, i) => 
                img.startsWith('data:') ? uploadToStorage(img, `${prefix}_body_${i}`) : Promise.resolve(img)
            );

            const uploadedFaceUrls = await Promise.all(faceUrlPromises);
            const uploadedBodyUrls = await Promise.all(bodyUrlPromises);

            const { error } = await supabase.from('saved_models').insert([{
                model_name: nombre.trim(),
                image_url: uploadedFaceUrls[0],
                body_image: uploadedBodyUrls[0],
                reference_images: [...uploadedFaceUrls.slice(1), ...uploadedBodyUrls.slice(1)],
                face_description: "PENDING_AUTO_ANALYSIS",
                hair_description: "PENDING_AUTO_ANALYSIS",
                user_id: user?.id,
            }]);
            if (error) throw error;

            onSuccess();
            onClose();
            setNombre(''); setFaceImages([]); setBodyImages([]);
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = nombre.trim() && faceImages.length > 0 && bodyImages.length > 0 && !loading;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] shrink-0">
                    <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">New Model</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">

                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Model Name</label>
                        <input
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="e.g. Sofia, Luna, Emma..."
                            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-reed-red outline-none rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] transition-colors placeholder:text-gray-500"
                        />
                    </div>

                    {/* Photos row */}
                    <div className="flex flex-col gap-3">
                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Reference Photos <span className="text-reed-red">*</span></label>

                        <div className="grid grid-cols-2 gap-3">
                            <PhotoSlot
                                id="slot-face"
                                icon={<Camera size={22} className="text-gray-400" />}
                                title="Face Photos"
                                description="Up to 4 close-ups"
                                values={faceImages}
                                onAdd={(vals) => setFaceImages(prev => [...prev, ...vals])}
                                onRemove={(idx) => setFaceImages(prev => prev.filter((_, i) => i !== idx))}
                                onRead={readFile}
                                max={4}
                            />
                            <PhotoSlot
                                id="slot-body"
                                icon={<PersonStanding size={22} className="text-gray-400" />}
                                title="Body Photos"
                                description="Up to 4 full body"
                                values={bodyImages}
                                onAdd={(vals) => setBodyImages(prev => [...prev, ...vals])}
                                onRemove={(idx) => setBodyImages(prev => prev.filter((_, i) => i !== idx))}
                                onRead={readFile}
                                max={4}
                            />
                        </div>

                        {/* What each photo is used for */}
                        <div className="grid grid-cols-2 gap-3 text-[10px] text-gray-500 leading-relaxed">
                            <p><span className="text-[var(--text-primary)] font-medium">Face →</span> Identity: eyes, skin tone, features, hair</p>
                            <p><span className="text-[var(--text-primary)] font-medium">Body →</span> Build: curves, proportions, height, weight</p>
                        </div>
                    </div>

                    {/* Info callout */}
                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-[11px] text-gray-500 leading-relaxed">
                        The AI extracts <span className="text-[var(--text-primary)]">only person identity</span> from these photos — background, lighting, and scene always come from the reference image you upload when generating.
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-[var(--border-color)] shrink-0">
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="w-full py-3 rounded-xl bg-reed-red text-white text-sm font-bold uppercase tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-reed-red-dark flex items-center justify-center gap-2"
                    >
                        {loading ? <><Loader2 size={15} className="animate-spin" /> Uploading...</> : 'Create Model'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Reusable photo slot ── */
interface PhotoSlotProps {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    values: string[];
    onAdd: (v: string[]) => void;
    onRemove: (idx: number) => void;
    onRead: (f: File) => Promise<string>;
    max: number;
}

const PhotoSlot: React.FC<PhotoSlotProps> = ({ id, icon, title, description, values, onAdd, onRemove, onRead, max }) => (
    <div className="flex flex-col gap-1.5 border border-[var(--border-color)] bg-[var(--bg-primary)] p-2 rounded-xl">
        <div className="flex justify-between items-center px-1 mb-1">
            <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">{title}</span>
            <span className="text-[10px] text-gray-500 font-medium">{values.length}/{max}</span>
        </div>
        
        {/* Grid setup */}
        <div className="grid grid-cols-2 gap-2">
            {values.map((val, idx) => (
                <div key={idx} className="relative aspect-[3/4] w-full rounded-lg overflow-hidden border border-[var(--border-color)]">
                    <img src={val} alt={`${title} ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                        <div className="absolute top-1 left-1 bg-reed-red text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">MAIN</div>
                    )}
                    <button
                        onClick={e => { e.stopPropagation(); onRemove(idx); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                        <X size={10} />
                    </button>
                </div>
            ))}

            {/* Upload button slot (only shown if under max) */}
            {values.length < max && (
                <div
                    onClick={(e) => {
                        e.preventDefault();
                        const inputEl = document.getElementById(id);
                        if (inputEl) inputEl.click();
                    }}
                    className="relative aspect-[3/4] w-full rounded-lg overflow-hidden border-2 border-dashed border-[var(--border-color)] hover:border-reed-red cursor-pointer bg-[var(--bg-secondary)] flex flex-col items-center justify-center gap-1 transition-colors p-2 text-center"
                >
                    {icon}
                    <span className="text-[9px] font-semibold text-[var(--text-primary)]">Add Photo</span>
                </div>
            )}
        </div>

        <input
            id={id}
            type="file"
            accept="image/*"
            multiple // Allow selecting multiple files at once
            className="hidden"
            onChange={async e => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                
                const newB64s: string[] = [];
                let currentCount = values.length;
                for (let i = 0; i < files.length; i++) {
                    if (currentCount >= max) break;
                    try {
                        const b64 = await onRead(files[i]);
                        newB64s.push(b64);
                        currentCount++;
                    } catch (err) {
                        console.error("Failed to read file", err);
                    }
                }
                
                if (newB64s.length > 0) {
                    onAdd(newB64s);
                }
                
                e.target.value = ''; // clean input so same file can be selected again if removed
            }}
        />
        <p className="text-[9px] text-gray-400 px-1 mt-1 leading-tight">{description}</p>
    </div>
);

export default ModelModal;
