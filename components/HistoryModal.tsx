import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Download, X, Calendar, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ModeloBase } from '../types';

interface GenerationRecord {
    id: string;
    created_at: string;
    model_name: string;
    image_url: string;
    prompt: string;
    aspect_ratio: string;
    resolution: string;
}

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
    const [generations, setGenerations] = useState<GenerationRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGen, setSelectedGen] = useState<GenerationRecord | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    const fetchHistory = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('generation_history')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setGenerations(data as GenerationRecord[]);
        }
        setLoading(false);
    };

    const handleDownload = (gen: GenerationRecord) => {
        const link = document.createElement('a');
        link.href = gen.image_url;
        link.download = `zakra_history_${gen.model_name}_${new Date(gen.created_at).getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-6xl h-[85vh] border border-zinc-800 bg-black shadow-2xl flex flex-col relative">

                {/* HEADER */}
                <div className="flex justify-between items-center border-b border-zinc-800 p-4 bg-zinc-950">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={16} className="text-zinc-500" />
                            HISTORIAL DE GENERACIONES
                        </h2>
                        <span className="text-[10px] text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded-full border border-zinc-800">
                            {generations.length} REGISTROS
                        </span>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">

                    {/* SIDEBAR: LIST */}
                    <div className="w-1/3 border-r border-zinc-800 overflow-y-auto p-4 bg-black/50">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                                <Loader2 size={24} className="animate-spin" />
                                <span className="text-[10px] uppercase">CARGANDO HISTORIAL...</span>
                            </div>
                        ) : generations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                                <ImageIcon size={24} />
                                <span className="text-[10px] uppercase">NO HAY GENERACIONES AÚN</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {generations.map((gen) => (
                                    <div
                                        key={gen.id}
                                        onClick={() => setSelectedGen(gen)}
                                        className={`aspect-square border cursor-pointer relative group overflow-hidden transition-all ${selectedGen?.id === gen.id ? 'border-white ring-1 ring-white/20' : 'border-zinc-800 hover:border-zinc-500'}`}
                                    >
                                        <img src={gen.image_url} alt={gen.model_name} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-2 transform translate-y-full group-hover:translate-y-0 transition-transform">
                                            <div className="text-[9px] text-white font-bold truncate">{gen.model_name}</div>
                                            <div className="text-[8px] text-zinc-400">{formatDate(gen.created_at)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MAIN: DETAIL VIEW */}
                    <div className="flex-1 bg-zinc-950/50 flex flex-col relative">
                        {selectedGen ? (
                            <div className="flex flex-col h-full">
                                {/* IMAGE PREVIEW */}
                                <div className="flex-1 flex items-center justify-center p-8 overflow-hidden bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-100">
                                    <img src={selectedGen.image_url} className="max-w-full max-h-full object-contain shadow-2xl border border-zinc-800" />
                                </div>

                                {/* METADATA FOOTER */}
                                <div className="h-48 border-t border-zinc-800 bg-black p-6 flex gap-8">
                                    <div className="flex-1 space-y-4 overflow-y-auto">
                                        <div>
                                            <label className="text-[9px] text-zinc-500 uppercase block mb-1">PROMPT / PAYLOAD</label>
                                            <p className="text-[10px] text-zinc-300 font-mono leading-relaxed bg-zinc-900/50 p-2 border border-zinc-800 rounded">
                                                {selectedGen.prompt ? (selectedGen.prompt.startsWith('{') ? 'JSON DATA (Ver en consola)' : selectedGen.prompt) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="w-64 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">MODELO</label>
                                                <span className="text-xs text-white block">{selectedGen.model_name}</span>
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">FECHA</label>
                                                <span className="text-xs text-white block">{formatDate(selectedGen.created_at)}</span>
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">RESOLUCIÓN</label>
                                                <span className="text-xs text-white block">{selectedGen.resolution || 'AUTO'}</span>
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">ASPECTO</label>
                                                <span className="text-xs text-white block">{selectedGen.aspect_ratio || 'AUTO'}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDownload(selectedGen)}
                                            className="w-full py-3 bg-white text-black hover:bg-zinc-200 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Download size={14} /> DESCARGAR IMAGEN
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-700">
                                <ImageIcon size={48} className="mb-4 opacity-20" />
                                <span className="text-xs uppercase tracking-widest">SELECCIONA UNA IMAGEN PARA VER DETALLES</span>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
