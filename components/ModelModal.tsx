import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { X, Loader2, Camera, PersonStanding, Plus } from 'lucide-react';

interface ModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ModelModal: React.FC<ModelModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [nombre, setNombre] = useState('');
    const [faceImage, setFaceImage] = useState('');
    const [bodyImage, setBodyImage] = useState('');
    const [extraAngles, setExtraAngles] = useState<string[]>([]); // up to 3 extra face angles
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
        if (!nombre.trim()) { alert("Enter a model name."); return; }
        if (!faceImage) { alert("Upload a face photo."); return; }
        if (!bodyImage) { alert("Upload a body photo."); return; }

        setLoading(true);
        try {
            const prefix = nombre.trim().replace(/\s+/g, '_');

            // Upload face, body, and extra angles in parallel
            const [faceUrl, bodyUrl, ...extraUrls] = await Promise.all([
                faceImage.startsWith('data:') ? uploadToStorage(faceImage, `${prefix}_face`) : Promise.resolve(faceImage),
                bodyImage.startsWith('data:') ? uploadToStorage(bodyImage, `${prefix}_body`) : Promise.resolve(bodyImage),
                ...extraAngles.map((img, i) =>
                    img.startsWith('data:') ? uploadToStorage(img, `${prefix}_angle${i + 1}`) : Promise.resolve(img)
                ),
            ]);

            const { error } = await supabase.from('saved_models').insert([{
                model_name: nombre.trim(),
                image_url: faceUrl,
                body_image: bodyUrl,
                reference_images: extraUrls.length > 0 ? extraUrls : null,
                face_description: "PENDING_AUTO_ANALYSIS",
                hair_description: "PENDING_AUTO_ANALYSIS",
                user_id: user?.id,
            }]);
            if (error) throw error;

            onSuccess();
            onClose();
            setNombre(''); setFaceImage(''); setBodyImage(''); setExtraAngles([]);
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = nombre.trim() && faceImage && bodyImage && !loading;

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
                                title="Face"
                                description="Clear close-up"
                                value={faceImage}
                                onSet={setFaceImage}
                                onClear={() => setFaceImage('')}
                                onRead={readFile}
                            />
                            <PhotoSlot
                                id="slot-body"
                                icon={<PersonStanding size={22} className="text-gray-400" />}
                                title="Body"
                                description="Full body visible"
                                value={bodyImage}
                                onSet={setBodyImage}
                                onClear={() => setBodyImage('')}
                                onRead={readFile}
                            />
                        </div>

                        {/* What each photo is used for */}
                        <div className="grid grid-cols-2 gap-3 text-[10px] text-gray-500 leading-relaxed">
                            <p><span className="text-[var(--text-primary)] font-medium">Face →</span> Identity: eyes, skin tone, features, hair</p>
                            <p><span className="text-[var(--text-primary)] font-medium">Body →</span> Build: curves, proportions, height, weight</p>
                        </div>
                    </div>

                    {/* Extra face angles */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                Extra Face Angles <span className="normal-case font-normal text-gray-500">(optional, up to 3)</span>
                            </label>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                            Add 3/4 view, profile, or other angles of the same face. The AI uses these to better understand the face structure and improve identity accuracy.
                        </p>
                        <div className="flex gap-2">
                            {/* Existing extra angles */}
                            {extraAngles.map((img, i) => (
                                <div key={i} className="relative w-16 h-20 rounded-lg overflow-hidden border border-reed-red/50 shrink-0">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setExtraAngles(prev => prev.filter((_, idx) => idx !== i))}
                                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                                    >
                                        <X size={8} />
                                    </button>
                                </div>
                            ))}
                            {/* Add button — only show if less than 3 */}
                            {extraAngles.length < 3 && (
                                <label className="w-16 h-20 rounded-lg border-2 border-dashed border-[var(--border-color)] hover:border-reed-red flex flex-col items-center justify-center cursor-pointer transition-colors shrink-0 bg-[var(--bg-secondary)]">
                                    <Plus size={16} className="text-gray-400" />
                                    <span className="text-[9px] text-gray-500 mt-1">Add</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const b64 = await readFile(file);
                                                setExtraAngles(prev => [...prev, b64]);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                            )}
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
    value: string;
    onSet: (v: string) => void;
    onClear: () => void;
    onRead: (f: File) => Promise<string>;
}

const PhotoSlot: React.FC<PhotoSlotProps> = ({ id, icon, title, description, value, onSet, onClear, onRead }) => (
    <div className="flex flex-col gap-1.5">
        {/* Upload area */}
        <div
            onClick={() => !value && document.getElementById(id)?.click()}
            className={`
                relative aspect-[3/4] w-full rounded-xl overflow-hidden border-2 transition-all
                ${value
                    ? 'border-reed-red/50 cursor-default'
                    : 'border-dashed border-[var(--border-color)] hover:border-reed-red cursor-pointer bg-[var(--bg-secondary)]'
                }
            `}
        >
            {value ? (
                <>
                    <img src={value} alt={title} className="w-full h-full object-cover" />
                    {/* Overlay label */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-6 pb-2 px-2">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">{title}</span>
                    </div>
                    {/* Remove button */}
                    <button
                        onClick={e => { e.stopPropagation(); onClear(); }}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                        <X size={11} />
                    </button>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3">
                    {icon}
                    <div className="text-center">
                        <p className="text-[11px] font-semibold text-[var(--text-primary)]">{title}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{description}</p>
                    </div>
                </div>
            )}
        </div>

        {/* Click to change when filled */}
        {value && (
            <button
                onClick={() => document.getElementById(id)?.click()}
                className="text-[10px] text-gray-500 hover:text-reed-red transition-colors text-center"
            >
                Change photo
            </button>
        )}

        <input
            id={id}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async e => {
                const file = e.target.files?.[0];
                if (file) onSet(await onRead(file));
                e.target.value = '';
            }}
        />
    </div>
);

export default ModelModal;
