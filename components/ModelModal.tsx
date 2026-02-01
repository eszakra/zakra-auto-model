import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { X, Loader2 } from 'lucide-react';

interface ModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ModelModal: React.FC<ModelModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [nombre, setNombre] = useState('');
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!nombre || !url) {
            alert("Image and name are required");
            return;
        }

        setLoading(true);

        try {
            let finalImageUrl = url;

            // If it's a data URL (Base64), upload it as a file
            if (url.startsWith('data:')) {
                const res = await fetch(url);
                const blob = await res.blob();
                const fileName = `${Date.now()}_${nombre.replace(/\s+/g, '_')}.png`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('models')
                    .upload(fileName, blob);

                if (uploadError) {
                    console.error("Upload error:", uploadError);
                    throw new Error("Error uploading image to storage: " + uploadError.message);
                }

                // Get Public URL
                const { data: publicUrlData } = supabase.storage
                    .from('models')
                    .getPublicUrl(fileName);

                finalImageUrl = publicUrlData.publicUrl;
            }

            const { error } = await supabase.from('saved_models').insert([
                {
                    model_name: nombre,
                    image_url: finalImageUrl,
                    face_description: "PENDING_AUTO_ANALYSIS",
                    hair_description: "PENDING_AUTO_ANALYSIS",
                    user_id: user?.id
                }
            ]);

            if (error) throw error;

            onSuccess();
            onClose();
            setNombre(''); setUrl('');

        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg border border-gray-200 bg-white rounded-xl p-6 shadow-2xl flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                    <div className="flex items-center gap-2">
                        <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png" alt="REED" className="h-5 w-auto" />
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Add New Model</h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-900 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-500 uppercase font-medium">Model Name</label>
                        <input 
                            value={nombre} 
                            onChange={e => setNombre(e.target.value)} 
                            className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm text-gray-900 outline-none focus:border-reed-red transition-colors" 
                            placeholder="e.g., Aisah, Sofia, Luna, Emma" 
                        />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-500 uppercase font-medium">Model Image</label>
                        <div
                            className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-reed-red transition-colors"
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
                                    <span className="text-3xl text-gray-300 mb-2 block">+</span>
                                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Upload Image (JPG/PNG)</span>
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
                        <p className="text-xs text-gray-400 self-end">Will be stored as base64</p>
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
                            Saving...
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
