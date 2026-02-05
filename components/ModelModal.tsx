import React, { useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { X, Loader2, Plus, ImagePlus } from 'lucide-react';

interface ModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const MAX_EXTRA_IMAGES = 4;

const ModelModal: React.FC<ModelModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [nombre, setNombre] = useState('');
    const [url, setUrl] = useState(''); // Primary image (base64 or URL)
    const [extraImages, setExtraImages] = useState<string[]>([]); // Additional reference images
    const [loading, setLoading] = useState(false);
    const extraInputRef = useRef<HTMLInputElement>(null);

    const uploadImageToStorage = async (dataUrl: string, prefix: string): Promise<string> => {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;

        const { error: uploadError } = await supabase.storage
            .from('models')
            .upload(fileName, blob);

        if (uploadError) {
            throw new Error("Error uploading image: " + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
            .from('models')
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    };

    const handleSubmit = async () => {
        if (!nombre || !url) {
            alert("Image and name are required");
            return;
        }

        setLoading(true);

        try {
            // Upload primary image
            let finalImageUrl = url;
            if (url.startsWith('data:')) {
                finalImageUrl = await uploadImageToStorage(url, nombre.replace(/\s+/g, '_'));
            }

            // Upload extra reference images
            const referenceUrls: string[] = [];
            for (const extra of extraImages) {
                if (extra.startsWith('data:')) {
                    const uploadedUrl = await uploadImageToStorage(extra, `${nombre.replace(/\s+/g, '_')}_ref`);
                    referenceUrls.push(uploadedUrl);
                } else {
                    referenceUrls.push(extra);
                }
            }

            const { error } = await supabase.from('saved_models').insert([
                {
                    model_name: nombre,
                    image_url: finalImageUrl,
                    reference_images: referenceUrls.length > 0 ? referenceUrls : null,
                    face_description: "PENDING_AUTO_ANALYSIS",
                    hair_description: "PENDING_AUTO_ANALYSIS",
                    user_id: user?.id
                }
            ]);

            if (error) throw error;

            onSuccess();
            onClose();
            setNombre('');
            setUrl('');
            setExtraImages([]);

        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExtraImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const remaining = MAX_EXTRA_IMAGES - extraImages.length;
        const filesToProcess = Array.from(files).slice(0, remaining);

        filesToProcess.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setExtraImages(prev => {
                    if (prev.length >= MAX_EXTRA_IMAGES) return prev;
                    return [...prev, reader.result as string];
                });
            };
            reader.readAsDataURL(file);
        });

        e.target.value = '';
    };

    const removeExtraImage = (index: number) => {
        setExtraImages(prev => prev.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
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
                        <label className="text-xs text-gray-500 uppercase font-medium">Model Name</label>
                        <input
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-sm text-[var(--text-primary)] outline-none focus:border-reed-red transition-colors"
                            placeholder="e.g., Aisah, Sofia, Luna, Emma"
                        />
                    </div>

                    {/* Primary Image */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-500 uppercase font-medium">Main Face Photo <span className="text-reed-red">*</span></label>
                        <div
                            className="border-2 border-dashed border-gray-300 bg-[var(--bg-secondary)] rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-reed-red transition-colors"
                            onClick={() => document.getElementById('model-upload')?.click()}
                        >
                            {url ? (
                                <div className="relative w-full aspect-square max-h-40">
                                    <img src={url} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setUrl(''); }}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <ImagePlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Upload Main Photo (JPG/PNG)</span>
                                </div>
                            )}
                            <input
                                id="model-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => setUrl(reader.result as string);
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Additional Reference Images */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-gray-500 uppercase font-medium">More Angles <span className="text-[var(--text-muted)] normal-case">(optional)</span></label>
                            <span className="text-xs text-[var(--text-muted)]">{extraImages.length}/{MAX_EXTRA_IMAGES}</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] -mt-1">Different angles help AI match the face more accurately</p>

                        <div className="grid grid-cols-4 gap-2">
                            {extraImages.map((img, index) => (
                                <div key={index} className="relative aspect-square bg-[var(--bg-secondary)] rounded-lg overflow-hidden border border-[var(--border-color)]">
                                    <img src={img} alt={`Ref ${index + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeExtraImage(index)}
                                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}

                            {extraImages.length < MAX_EXTRA_IMAGES && (
                                <button
                                    onClick={() => extraInputRef.current?.click()}
                                    className="aspect-square border-2 border-dashed border-[var(--border-color)] rounded-lg flex flex-col items-center justify-center hover:border-reed-red hover:text-reed-red text-[var(--text-muted)] transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            )}
                        </div>

                        <input
                            ref={extraInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleExtraImageUpload}
                        />
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-3 bg-reed-red text-white text-sm font-bold uppercase rounded-lg hover:bg-reed-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            {extraImages.length > 0 ? 'Uploading images...' : 'Saving...'}
                        </>
                    ) : (
                        'Create Record'
                    )}
                </button>
            </div>
        </div>
    );
};

export default ModelModal;
