import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { X, Loader2, ImagePlus } from 'lucide-react';

interface ModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ModelModal: React.FC<ModelModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [nombre, setNombre] = useState('');
    const [faceImage, setFaceImage] = useState('');   // Close-up face photo
    const [bodyImage, setBodyImage] = useState('');   // Full body photo
    const [loading, setLoading] = useState(false);

    const dataUrlToBlob = (dataUrl: string): Blob => {
        const [header, base64] = dataUrl.split(',');
        const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes], { type: mime });
    };

    const uploadImageToStorage = async (dataUrl: string, prefix: string): Promise<string> => {
        const blob = dataUrlToBlob(dataUrl);
        const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
        const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('models')
            .upload(fileName, blob, { contentType: blob.type });

        if (uploadError) {
            throw new Error("Error uploading image: " + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
            .from('models')
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    };

    const readFile = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const handleSubmit = async () => {
        if (!nombre || !faceImage || !bodyImage) {
            alert("Model name, face photo, and body photo are all required.");
            return;
        }

        setLoading(true);

        try {
            const prefix = nombre.replace(/\s+/g, '_');

            // Upload face photo
            const finalFaceUrl = faceImage.startsWith('data:')
                ? await uploadImageToStorage(faceImage, `${prefix}_face`)
                : faceImage;

            // Upload body photo
            const finalBodyUrl = bodyImage.startsWith('data:')
                ? await uploadImageToStorage(bodyImage, `${prefix}_body`)
                : bodyImage;

            const { error } = await supabase.from('saved_models').insert([
                {
                    model_name: nombre,
                    image_url: finalFaceUrl,         // face = primary identity source
                    body_image: finalBodyUrl,         // body = proportions/type source
                    reference_images: null,           // legacy field, not used in new flow
                    face_description: "PENDING_AUTO_ANALYSIS",
                    hair_description: "PENDING_AUTO_ANALYSIS",
                    user_id: user?.id
                }
            ]);

            if (error) throw error;

            onSuccess();
            onClose();
            setNombre('');
            setFaceImage('');
            setBodyImage('');

        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const ImageSlot = ({
        id,
        label,
        hint,
        required,
        value,
        onSet,
        onClear,
        aspect,
    }: {
        id: string;
        label: string;
        hint: string;
        required?: boolean;
        value: string;
        onSet: (v: string) => void;
        onClear: () => void;
        aspect: string; // tailwind aspect class e.g. 'aspect-[3/4]'
    }) => (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 uppercase font-medium tracking-wide">
                {label} {required && <span className="text-reed-red">*</span>}
            </label>
            <p className="text-xs text-[var(--text-muted)] -mt-1">{hint}</p>
            <div
                className={`${aspect} w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-reed-red transition-colors overflow-hidden bg-[var(--bg-secondary)] relative ${value ? 'border-reed-red/60' : 'border-[var(--border-color)]'}`}
                onClick={() => document.getElementById(id)?.click()}
            >
                {value ? (
                    <>
                        <img src={value} alt={label} className="w-full h-full object-cover" />
                        <button
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full hover:bg-red-500 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </>
                ) : (
                    <div className="text-center py-4 px-2">
                        <ImagePlus className="w-7 h-7 text-gray-400 mx-auto mb-2" />
                        <span className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">Upload</span>
                    </div>
                )}
            </div>
            <input
                id={id}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) onSet(await readFile(file));
                    e.target.value = '';
                }}
            />
        </div>
    );

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
                    <div className="flex items-center gap-2">
                        <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png" alt="REED" className="h-5 w-auto" />
                        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">Add New Model</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-[var(--text-primary)] p-1 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Model Name */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-500 uppercase font-medium tracking-wide">Model Name <span className="text-reed-red">*</span></label>
                        <input
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-sm text-[var(--text-primary)] outline-none focus:border-reed-red transition-colors"
                            placeholder="e.g., Sofia, Luna, Emma"
                        />
                    </div>

                    {/* Two slots side by side: Face + Body */}
                    <div className="grid grid-cols-2 gap-3">
                        <ImageSlot
                            id="upload-face"
                            label="Face Photo"
                            hint="Clear close-up of the face"
                            required
                            value={faceImage}
                            onSet={setFaceImage}
                            onClear={() => setFaceImage('')}
                            aspect="aspect-[3/4]"
                        />
                        <ImageSlot
                            id="upload-body"
                            label="Body Photo"
                            hint="Full body — shows curves, height & build"
                            required
                            value={bodyImage}
                            onSet={setBodyImage}
                            onClear={() => setBodyImage('')}
                            aspect="aspect-[3/4]"
                        />
                    </div>

                    {/* Helper note */}
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed bg-[var(--bg-secondary)] rounded-lg px-3 py-2 border border-[var(--border-color)]">
                        The <span className="text-[var(--text-primary)] font-medium">face photo</span> is used to extract identity (eyes, skin tone, features). The <span className="text-[var(--text-primary)] font-medium">body photo</span> is used to capture body type, proportions, and curves — so the AI never guesses or invents them.
                    </p>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading || !nombre || !faceImage || !bodyImage}
                    className="w-full py-3 bg-reed-red text-white text-sm font-bold uppercase rounded-lg hover:bg-reed-red-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        'Create Model'
                    )}
                </button>
            </div>
        </div>
    );
};

export default ModelModal;
