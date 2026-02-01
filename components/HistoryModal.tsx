import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Download, X, Calendar, Image as ImageIcon, Loader2 } from 'lucide-react';

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
        // Use generation_logs table with user filter (RLS will handle this automatically)
        const { data, error } = await supabase
            .from('generation_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setGenerations(data as GenerationRecord[]);
        } else if (error) {
            console.error('Error fetching history:', error);
        }
        setLoading(false);
    };

    const handleDownload = (gen: GenerationRecord) => {
        const link = document.createElement('a');
        link.href = gen.image_url;
        link.download = `reed_history_${gen.model_name}_${new Date(gen.created_at).getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-6xl h-[85vh] border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl flex flex-col relative rounded-xl overflow-hidden">

                {/* HEADER */}
                <div className="flex justify-between items-center border-b border-[var(--border-color)] p-4 bg-[var(--bg-primary)]">
                    <div className="flex items-center gap-3">
                        <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png" alt="REED" className="h-6 w-auto" />
                        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            Generation History
                        </h2>
                        <span className="text-xs text-gray-500 px-2 py-0.5 bg-[var(--bg-secondary)] rounded-full border border-[var(--border-color)]">
                            {generations.length} Records
                        </span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-[var(--text-primary)] transition-colors p-1 hover:bg-[var(--bg-secondary)] rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">

                    {/* SIDEBAR: LIST */}
                    <div className="w-1/3 border-r border-[var(--border-color)] overflow-y-auto p-4 bg-[var(--bg-secondary)]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                <Loader2 size={24} className="animate-spin text-reed-red" />
                                <span className="text-xs uppercase font-medium">Loading History...</span>
                            </div>
                        ) : generations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                <ImageIcon size={24} />
                                <span className="text-xs uppercase font-medium">No Generations Yet</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {generations.map((gen) => (
                                    <div
                                        key={gen.id}
                                        onClick={() => setSelectedGen(gen)}
                                        className={`aspect-square border-2 cursor-pointer relative group overflow-hidden transition-all rounded-lg ${selectedGen?.id === gen.id ? 'border-reed-red ring-2 ring-reed-red/20' : 'border-[var(--border-color)] hover:border-gray-300'}`}
                                    >
                                        <img src={gen.image_url} alt={gen.model_name} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-2 transform translate-y-full group-hover:translate-y-0 transition-transform border-t border-gray-100">
                                            <div className="text-xs text-[var(--text-primary)] font-semibold truncate">{gen.model_name}</div>
                                            <div className="text-[10px] text-gray-500">{formatDate(gen.created_at)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MAIN: DETAIL VIEW */}
                    <div className="flex-1 bg-white flex flex-col relative">
                        {selectedGen ? (
                            <div className="flex flex-col h-full">
                                {/* IMAGE PREVIEW */}
                                <div className="flex-1 flex items-center justify-center p-8 overflow-hidden bg-[var(--bg-secondary)]">
                                    <img src={selectedGen.image_url} className="max-w-full max-h-full object-contain shadow-xl rounded-lg border border-[var(--border-color)]" />
                                </div>

                                {/* METADATA FOOTER */}
                                <div className="h-auto min-h-[180px] border-t border-[var(--border-color)] bg-white p-6">
                                    <div className="flex gap-6">
                                        <div className="flex-1 space-y-4 overflow-y-auto">
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase font-medium block mb-2">Prompt Used</label>
                                                <div className="text-xs text-[var(--text-primary)] font-mono leading-relaxed bg-[var(--bg-secondary)] p-3 border border-[var(--border-color)] rounded-lg max-h-40 overflow-y-auto">
                                                    {selectedGen.prompt ? (
                                                        selectedGen.prompt.startsWith('{') ? (
                                                            // Try to parse and display JSON nicely
                                                            (() => {
                                                                try {
                                                                    const parsed = JSON.parse(selectedGen.prompt);
                                                                    return (
                                                                        <div className="space-y-2">
                                                                            {parsed.contents?.[0]?.parts?.[0]?.text && (
                                                                                <div>
                                                                                    <span className="text-reed-red font-semibold">Main Prompt:</span>
                                                                                    <p className="mt-1 text-[var(--text-secondary)]">{parsed.contents[0].parts[0].text}</p>
                                                                                </div>
                                                                            )}
                                                                            <details className="mt-2">
                                                                                <summary className="cursor-pointer text-gray-500 hover:text-[var(--text-primary)]">View Full JSON</summary>
                                                                                <pre className="mt-2 text-[10px] text-gray-500 whitespace-pre-wrap">{JSON.stringify(parsed, null, 2)}</pre>
                                                                            </details>
                                                                        </div>
                                                                    );
                                                                } catch {
                                                                    return <pre className="whitespace-pre-wrap">{selectedGen.prompt}</pre>;
                                                                }
                                                            })()
                                                        ) : (
                                                            <p className="whitespace-pre-wrap">{selectedGen.prompt}</p>
                                                        )
                                                    ) : (
                                                        <span className="text-gray-400 italic">No prompt data available</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-72 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase font-medium block mb-1">Model</label>
                                                    <span className="text-sm text-[var(--text-primary)] font-medium block">{selectedGen.model_name}</span>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase font-medium block mb-1">Date</label>
                                                    <span className="text-sm text-[var(--text-primary)] font-medium block">{formatDate(selectedGen.created_at)}</span>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase font-medium block mb-1">Resolution</label>
                                                    <span className="text-sm text-[var(--text-primary)] font-medium block">{selectedGen.resolution || 'AUTO'}</span>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 uppercase font-medium block mb-1">Aspect</label>
                                                    <span className="text-sm text-[var(--text-primary)] font-medium block">{selectedGen.aspect_ratio || 'AUTO'}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDownload(selectedGen)}
                                                className="w-full py-3 bg-reed-red text-white hover:bg-reed-red-dark text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Download size={16} /> Download Image
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                                <ImageIcon size={48} className="mb-4 opacity-30" />
                                <span className="text-sm uppercase tracking-wide font-medium text-gray-400">Select an image to view details</span>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
