import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface ModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ModelModal: React.FC<ModelModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [nombre, setNombre] = useState('');
    const [url, setUrl] = useState('');
    // Removed face/hair manual inputs
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!nombre || !url) { // url here will hold the file object temporarily or we add a new state for file
            alert("IMAGEN Y NOMBRE OBLIGATORIOS");
            return;
        }

        // Check if URL is a base64 string (meaning a file was selected)
        // In a real app we would store the File object, but our previous step saved base64 to 'url' state.
        // We need to convert it back to a Blob or change how we handle the input.
        // For simplicity, let's assume we change the state to hold the File or we upload the base64.
        // Supabase upload accepts Blob/File.

        setLoading(true);

        try {
            let finalImageUrl = url;

            // Si es una data URL (Base64), intentamos subirla como archivo
            if (url.startsWith('data:')) {
                const res = await fetch(url);
                const blob = await res.blob();
                const fileName = `${Date.now()}_${nombre.replace(/\s+/g, '_')}.png`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('models')
                    .upload(fileName, blob);

                if (uploadError) {
                    console.error("Upload error:", uploadError);
                    // Fallback: Si falla el storage (ej. no existe bucket), avisamos pero permitimos intentar guardar base64 si el usuario insiste? NO, mejor error.
                    throw new Error("ERROR AL SUBIR IMAGEN A STORAGE: " + uploadError.message);
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
                    hair_description: "PENDING_AUTO_ANALYSIS"
                }
            ]);

            if (error) throw error;

            onSuccess();
            onClose();
            setNombre(''); setUrl('');

        } catch (error: any) {
            alert("ERROR: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg border border-zinc-700 bg-black p-6 shadow-2xl flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <h2 className="text-sm font-bold text-white uppercase">// AGREGAR NUEVA MODELO</h2>
                    <button onClick={onClose} className="text-xs text-zinc-500 hover:text-white uppercase">[ CERRAR ]</button>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-500 uppercase">NOMBRE_CLAVE</label>
                        <input value={nombre} onChange={e => setNombre(e.target.value)} className="bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-white" placeholder="Ej: Aisah" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-500 uppercase">IMAGEN DEL MODELO</label>
                        <div
                            className="border border-dashed border-zinc-700 bg-zinc-900 p-4 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors"
                            onClick={() => document.getElementById('model-upload')?.click()}
                        >
                            {url ? (
                                <div className="relative w-full aspect-square max-h-40">
                                    <img src={url} alt="Preview" className="w-full h-full object-contain" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setUrl(''); }}
                                        className="absolute top-0 right-0 bg-red-600 text-white text-[10px] p-1 uppercase"
                                    >
                                        [ X ]
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <span className="text-2xl text-zinc-600 mb-2 block">+</span>
                                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest">SUBIR IMAGEN (JPG/PNG)</span>
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
                        <p className="text-[9px] text-zinc-600 self-end mt-1">SE GUARDARÁ COMO BASE64</p>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full border border-white py-3 text-xs font-bold uppercase hover:bg-white hover:text-black transition-colors disabled:opacity-50 mt-2"
                >
                    {loading ? '[ GUARDANDO... ]' : '[ CREAR REGISTRO ]'}
                </button>
            </div>
        </div>
    );
};

export default ModelModal;