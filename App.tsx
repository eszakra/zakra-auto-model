import React, { useState, useEffect, useRef } from 'react';
import { supabase, uploadBase64Image } from './services/supabaseClient';
import { constructPayload, generateIndustrialImage } from './services/geminiService';
import { AppState, ModeloBase, QueueItem } from './types';
import ModelModal from './components/ModelModal';
import HistoryModal from './components/HistoryModal';
import { RefreshCcw, Plus, AlertCircle, Cpu, Calendar, CheckCircle2, Loader2, Download, Play, Layers } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const App: React.FC = () => {
  // --- AUTH & CONFIG ---
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('zakra_api_key') || '');
  const [hasAccess, setHasAccess] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // --- APP STATE ---
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- COL 1: LIBRARY ---
  const [modelos, setModelos] = useState<ModeloBase[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModeloBase | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showHistory, setShowHistory] = useState(false); // NEW History State

  // --- EDIT/DELETE STATE ---
  const [editingModel, setEditingModel] = useState<ModeloBase | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmModel, setDeleteConfirmModel] = useState<ModeloBase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- COL 2: REFERENCE & INPUTS ---
  const [refImage, setRefImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- BATCH MODE ---
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const isBatchMode = queue.length > 1;

  // NEW: Store the generated payload instead of separate inputs
  const [generatedPayload, setGeneratedPayload] = useState<any | null>(null);

  // --- COL 3: OUTPUT ---
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // --- RENDER OPTIONS ---
  const [selectedResolution, setSelectedResolution] = useState<string>('AUTO');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('1:1');

  const RESOLUTIONS = ['AUTO', '1K', '2K', '4K'];
  const ASPECT_RATIOS = ['AUTO', '1:1', '4:3', '3:4', '4:5', '16:9', '9:16'];

  // Download handler
  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `zakra_${selectedModel?.model_name || 'output'}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    checkAuth();
    fetchModelos();
  }, []);

  const checkAuth = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasAccess(hasKey);
    } else {
      // Check if we have a stored API key or environment variable (NO hardcoded fallback)
      const storedKey = localStorage.getItem('zakra_api_key');
      const envKey = import.meta.env.VITE_API_KEY || '';
      const activeKey = storedKey || envKey;
      setCustomApiKey(activeKey);
      setHasAccess(!!activeKey);
    }
    setLoadingAuth(false);
  };

  // Get current API key (NO hardcoded fallback - user must configure)
  const getCurrentApiKey = () => {
    const key = customApiKey || import.meta.env.VITE_API_KEY || '';
    if (!key) {
      setShowSettings(true);
    }
    return key;
  };

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem('zakra_api_key', tempApiKey.trim());
      setCustomApiKey(tempApiKey.trim());
    }
    setShowSettings(false);
    setTempApiKey('');
  };

  const handleAuth = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasAccess(true);
    }
  };

  const fetchModelos = async () => {
    setLoadingModels(true);
    const { data, error } = await supabase.from('saved_models').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error("Error fetching models:", error);
    } else {
      setModelos(data || []);
    }
    setLoadingModels(false);
  };

  // --- UPLOAD & BATCH LOGIC ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 1. Immediate Reset
    setGeneratedPayload(null);
    setGeneratedImage(null);
    setAppState(AppState.IDLE);
    setRefImage(null);
    setQueue([]);

    // 2. Process Files
    if (files.length === 1) {
      // SINGLE MODE
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // BATCH MODE
      const newQueue: QueueItem[] = Array.from(files).map((file: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file), // Provide URL immediately
        status: 'PENDING'
      }));
      setQueue(newQueue);
    }

    // Reset input
    e.target.value = '';
  };

  const startBatch = async () => {
    if (!selectedModel) {
      alert("SELECCIONA UN MODELO PRIMERO");
      return;
    }

    // Check if any pending
    const hasPending = queue.some(q => q.status === 'PENDING' || q.status === 'ERROR');
    if (!hasPending) return;

    // We don't set a global blocking state to allow UI updates, 
    // but we could set a "BATCH_RUNNING" state if we wanted to lock things.
    // For now, relies on visual cues on items.

    // We need to work on a copy or reference? 
    // State updates are async, so we iterate indices or IDs.
    // NOTE: This loop captures 'queue' at start time. 
    // Better to just iterate IDs and read current state inside if needed, 
    // but 'queue' state changes won't be reflected in this closure 'queue'.
    // However, since we define specific IDs, it's fine.

    const itemIds = queue.map(q => q.id);

    for (const itemId of itemIds) {
      // Build fresh check since state updates
      // Actually, we can't easily check fresh state without ref or func update.
      // Simplified: Just try to process all that were in queue at start.
      // We will check status inside processBatchItem to avoid re-processing COMPLETED.
      await processBatchItem(itemId);
    }
  };

  const processBatchItem = async (itemId: string) => {
    // 0. Check Status (via functional update to be safe, or just trust flow)
    // We'll trust flow but we need to get the ITEM details.
    // We can't use 'queue' state here directly if it's stale.
    // We'll use a functional update pattern to get the item, but we need the item DATA for processing.
    // Hack: we'll use the 'queue' from closure? No, stale.
    // Re-architect: Use a useRef for queue? Or just pass item data?
    // Let's assume queue state is updated fast enough or use a getter.
    // Actually, in a for-loop with await, the component might re-render.
    // The 'queue' variable in 'startBatch' (closure) is constant.
    // 'processBatchItem' closes over 'queue' if defined outside? state 'queue' is constantly new.
    // We need the LATEST queue to find the item.

    // SOLUTION: Pass the item object from startBatch?
    // But startBatch has stale queue.
    // Better: Helper to get item.

    let currentItem: QueueItem | undefined;
    setQueue(prev => {
      currentItem = prev.find(q => q.id === itemId);
      if (currentItem && currentItem.status === 'PENDING') {
        return prev.map(q => q.id === itemId ? { ...q, status: 'ANALYZING' } : q);
      }
      return prev;
    });

    // Wait for state ? No.
    // We need the file. 'currentItem' above is captured synchronously in the updater?
    // Yes, but let's grab it more explicitly.
    // Actually, 'queue' in the component scope might be updated if we put 'processBatchItem' in a useEffect or use a ref.
    // To keep it simple: We'll pass the FILE object from startBatch if possible? 
    // No, cleaner is to use a ref to track queue for logic, OR just trust that we iterate IDs and finding them is enough.
    // But we need the 'file' blob.

    // Let's use a function to get the current item from the latest state inside the setter, 
    // but we can't await inside the setter.

    // Workaround: We'll iterate the queue from startBatch (stale), grab the file (which is constant), 
    // and only update status in state.
    // Correct. The 'file' doesn't change.
  };

  // Re-write processBatchItem correctly:
  const processBatchItemReal = async (item: QueueItem) => {
    // 1. Set Analyzing
    setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'ANALYZING' } : q));

    try {
      if (!selectedModel) throw new Error("No model selected");

      // Analysis
      const currentKey = getCurrentApiKey();
      const base64Ref = await fileToBase64(item.file);
      const { generateUnifiedPayload, generateIndustrialImage } = await import('./services/geminiService');
      const payload = await generateUnifiedPayload(currentKey, selectedModel.image_url, base64Ref);

      // Set Generating
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'GENERATING', payload } : q));

      // Generation
      const resultBase64 = await generateIndustrialImage(
        currentKey,
        payload,
        selectedModel.image_url,
        selectedResolution === 'AUTO' ? undefined : selectedResolution,
        selectedAspectRatio === 'AUTO' ? undefined : selectedAspectRatio
      );

      // Save
      const fileName = `batch_${Date.now()}_${item.id}.png`;
      const publicUrl = await uploadBase64Image(resultBase64, 'generations', fileName);
      await supabase.from('generation_history').insert({
        model_name: selectedModel.model_name,
        image_url: publicUrl,
        prompt: JSON.stringify(payload),
        aspect_ratio: selectedAspectRatio,
        resolution: selectedResolution
      });

      // Complete
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'COMPLETED', resultImage: resultBase64 } : q));

    } catch (e: any) {
      console.error(e);
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'ERROR', error: e.message } : q));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Rewrite startBatch to use the Real processor
  const startBatchReal = async () => {
    if (!selectedModel) { alert("MODELO?"); return; }

    const pendingItems = queue.filter(q => q.status === 'PENDING');
    for (const item of pendingItems) {
      await processBatchItemReal(item);
    }
  };

  const handleDownloadBatchZip = async () => {
    const zip = new JSZip();
    const completedItems = queue.filter(q => q.status === 'COMPLETED' && q.resultImage);
    if (completedItems.length === 0) return;
    completedItems.forEach((item, index) => {
      const imgData = item.resultImage!.split(',')[1];
      zip.file(`zakra_batch_${index + 1}.png`, imgData, { base64: true });
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `zakra_batch_${Date.now()}.zip`);
  };

  // --- EDIT MODEL ---
  const handleStartEdit = (modelo: ModeloBase, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModel(modelo);
    setEditName(modelo.model_name);
  };

  const handleSaveEdit = async () => {
    if (!editingModel || !editName.trim()) return;

    const { error } = await supabase
      .from('saved_models')
      .update({ model_name: editName.trim() })
      .eq('id', editingModel.id);

    if (error) {
      alert("ERROR AL EDITAR: " + error.message);
    } else {
      fetchModelos();
      if (selectedModel?.id === editingModel.id) {
        setSelectedModel({ ...selectedModel, model_name: editName.trim() });
      }
    }
    setEditingModel(null);
    setEditName('');
  };

  // --- DELETE MODEL ---
  const handleStartDelete = (modelo: ModeloBase, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmModel(modelo);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModel) return;
    setIsDeleting(true);

    const { error } = await supabase
      .from('saved_models')
      .delete()
      .eq('id', deleteConfirmModel.id);

    if (error) {
      alert("ERROR AL ELIMINAR: " + error.message);
    } else {
      fetchModelos();
      if (selectedModel?.id === deleteConfirmModel.id) {
        setSelectedModel(null);
      }
    }
    setIsDeleting(false);
    setDeleteConfirmModel(null);
  };

  const runAutoAnalysis = async () => {
    if (!selectedModel || !refImage) {
      alert("SELECCIONA MODELO Y REFERENCIA PRIMERO");
      return;
    }

    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    setGeneratedPayload(null);

    try {
      // CALL NEW GEMINI SERVICE
      const currentKey = getCurrentApiKey();

      // Import dynamic function to avoid circular dep issues in some bundlers if not careful, but direct import is fine here
      const { generateUnifiedPayload } = await import('./services/geminiService');

      const payload = await generateUnifiedPayload(currentKey, selectedModel.image_url, refImage);
      setGeneratedPayload(payload);
      setAppState(AppState.IDLE);

    } catch (e: any) {
      console.error(e);
      setAppState(AppState.ERROR);
      setErrorMsg("FALLO ANALISIS: " + e.message);
    }
  };

  // --- GENERATION LOGIC ---
  const handleExecute = async () => {
    if (!generatedPayload) {
      alert("PRIMERO DEBES REALIZAR EL ANALISIS (PASO 2)");
      return;
    }

    setAppState(AppState.GENERATING);
    setErrorMsg(null);
    const currentKey = getCurrentApiKey();

    try {
      const { generateIndustrialImage } = await import('./services/geminiService');
      // Pass base model image, resolution, and aspect ratio to generation
      const result = await generateIndustrialImage(
        currentKey,
        generatedPayload,
        selectedModel?.image_url || "", // Pass BASE MODEL image
        selectedResolution === 'AUTO' ? undefined : selectedResolution,
        selectedAspectRatio === 'AUTO' ? undefined : selectedAspectRatio
      );
      setGeneratedImage(result);
      setAppState(AppState.COMPLETE);

      // AUTO SAVE TO HISTORY
      saveToHistory(result, generatedPayload);

    } catch (error: any) {
      setAppState(AppState.ERROR);
      setErrorMsg(error.message);
    }
  };

  const saveToHistory = async (base64Image: string, payload: any) => {
    try {
      if (!selectedModel) return;

      const fileName = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
      const publicUrl = await uploadBase64Image(base64Image, 'generations', fileName);

      await supabase.from('generation_history').insert({
        model_name: selectedModel.model_name,
        image_url: publicUrl,
        prompt: JSON.stringify(payload),
        aspect_ratio: selectedAspectRatio,
        resolution: selectedResolution
      });
      console.log('Saved to history');
    } catch (err) {
      console.error('Failed to save history:', err);
    }
  };

  // --- RENDER HELPERS ---
  if (loadingAuth) return <div className="h-screen flex items-center justify-center bg-black text-white text-xs">VERIFICANDO CREDENCIALES...</div>;

  if (!hasAccess) {
    return (
      <div className="h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4 border-4 border-zinc-900 m-2">
        <div className="text-red-600 mb-4"><AlertCircle size={48} /></div>
        <h1 className="text-xl tracking-[0.3em] font-bold text-red-600">// ACCESO DENEGADO</h1>
        <button onClick={handleAuth} className="mt-8 px-6 py-3 border border-red-600 text-red-600 hover:bg-red-600 hover:text-white uppercase text-xs font-bold tracking-widest transition-all">
          [ AUTENTICAR CLAVE API ]
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-zakra-text font-mono flex flex-col overflow-hidden selection:bg-white selection:text-black">

      <header className="h-12 border-b border-zakra-border flex justify-between items-center px-4 bg-black z-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${appState === AppState.GENERATING || appState === AppState.ANALYZING ? 'bg-orange-500 animate-pulse' : customApiKey ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
          <h1 className="text-xs font-bold tracking-[0.2em] text-white">AUTO MODEL BY ZAKRA</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHistory(true)}
            className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors"
          >
            <Calendar size={12} /> HISTORIAL
          </button>

          <button
            onClick={() => { setTempApiKey(customApiKey); setShowSettings(true); }}
            className={`text-[10px] uppercase tracking-widest flex items-center gap-1 ${!customApiKey ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
          >
            ⚙ {!customApiKey ? 'CONFIGURAR API' : 'AJUSTES'}
          </button>
          <div className={`text-[10px] uppercase ${customApiKey ? 'text-zinc-600' : 'text-red-500'}`}>{customApiKey ? 'ONLINE' : 'SIN API KEY'}</div>
        </div>
      </header>

      {/* 3-COLUMN GRID */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-zakra-border overflow-hidden">

        {/* COL 1: LIBRARY */}
        <section className="flex flex-col h-full bg-black/50 overflow-y-auto">
          <div className="p-3 border-b border-zakra-border bg-zinc-900/20 sticky top-0 backdrop-blur-sm z-10 flex justify-between items-center">
            <h2 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${selectedModel ? 'bg-green-500 text-black' : 'bg-white text-black'}`}>1</span>
              <span className="text-white">SELECCIONA TU MODELO</span>
            </h2>
            <button onClick={fetchModelos} className="text-zinc-600 hover:text-white"><RefreshCcw size={12} /></button>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {/* GRID OF MODELS */}
            {loadingModels ? (
              <div className="text-[10px] text-zinc-600">CARGANDO DATOS...</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {modelos.map(modelo => (
                  <div
                    key={modelo.id}
                    onClick={() => setSelectedModel(modelo)}
                    className={`cursor-pointer border p-1 transition-all relative group ${selectedModel?.id === modelo.id ? 'border-white bg-zinc-900' : 'border-zinc-800 hover:border-zinc-600'}`}
                  >
                    {/* Action buttons - show on hover */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={(e) => handleStartEdit(modelo, e)}
                        className="w-6 h-6 bg-zinc-800 hover:bg-blue-600 text-white text-[10px] flex items-center justify-center"
                        title="Editar nombre"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => handleStartDelete(modelo, e)}
                        className="w-6 h-6 bg-zinc-800 hover:bg-red-600 text-white text-[10px] flex items-center justify-center"
                        title="Eliminar modelo"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="aspect-square bg-zinc-900 mb-2 overflow-hidden">
                      <img src={modelo.image_url} alt={modelo.model_name} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-[9px] font-bold truncate uppercase px-1">{modelo.model_name}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ADD BUTTON */}
            <button
              onClick={() => setShowModal(true)}
              className="w-full py-3 border border-dashed border-zinc-700 hover:border-white hover:text-white text-zinc-500 text-[10px] uppercase flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={12} /> [ + NUEVA MODELO ]
            </button>

            {selectedModel && (
              <div className="mt-2 text-[9px] text-zinc-500">
                MODELO SELECCIONADO: <span className="text-white">{selectedModel.model_name}</span>
              </div>
            )}
          </div>
        </section>

        {/* COL 2: REFERENCE & ANALYSIS */}
        <section className={`flex flex-col h-full bg-black/50 overflow-y-auto relative ${!selectedModel ? 'pointer-events-none' : ''}`}>
          {/* LOCK OVERLAY when no model selected */}
          {!selectedModel && (
            <div className="absolute inset-0 bg-black/80 z-30 backdrop-blur-md" />
          )}
          <div className="p-3 border-b border-zakra-border bg-zinc-900/20 sticky top-0 backdrop-blur-sm z-10">
            <h2 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${selectedModel ? 'bg-green-500 text-black' : 'bg-zinc-700 text-zinc-400'}`}>2</span>
              <span className={selectedModel ? 'text-white' : 'text-zinc-600'}>SUBIR REFERENCIA Y ANALIZAR</span>
            </h2>
          </div>

          <div className="p-4 flex flex-col gap-6">
            {/* DROP ZONE */}
            <div
              className={`aspect-square w-full border border-dashed ${refImage || isBatchMode ? 'border-white bg-zinc-900' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900'} relative flex flex-col items-center justify-center transition-all group overflow-hidden ${!isBatchMode ? 'cursor-pointer' : ''}`}
              onClick={() => !isBatchMode && fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />

              {isBatchMode ? (
                <div className="w-full h-full p-2 grid grid-cols-3 gap-2 overflow-y-auto content-start scrollbar-thin scrollbar-thumb-zinc-700">
                  {queue.map(q => (
                    <div key={q.id} className="relative aspect-square bg-zinc-800 border border-zinc-700">
                      <img src={q.previewUrl} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        {q.status === 'PENDING' && <div className="w-2 h-2 bg-zinc-500 rounded-full" />}
                        {q.status === 'ANALYZING' && <Loader2 className="animate-spin text-orange-500 w-5 h-5" />}
                        {q.status === 'GENERATING' && <Loader2 className="animate-spin text-green-500 w-5 h-5" />}
                        {q.status === 'COMPLETED' && <CheckCircle2 className="text-green-500 w-5 h-5" />}
                        {q.status === 'ERROR' && <AlertCircle className="text-red-500 w-5 h-5" />}
                      </div>
                    </div>
                  ))}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer flex items-center justify-center border border-zinc-700 text-zinc-500 text-xs aspect-square hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <Plus size={16} />
                  </div>
                </div>
              ) : refImage ? (
                <img src={refImage} alt="Reference" className="h-full w-full object-contain p-2" />
              ) : (
                <div className="text-center p-4">
                  <div className="text-4xl text-zinc-700 font-light mb-2 group-hover:text-white transition-colors">+</div>
                  <span className="text-[9px] text-zinc-500 group-hover:text-white uppercase tracking-widest block">SUBIR REFERENCIA(S)</span>
                </div>
              )}
            </div>

            {/* ANALYSIS TRIGGER AND OUTPUT */}
            <div className="flex flex-col gap-2">
              {/* ANALYSIS BUTTON - Hide in Batch Mode */}
              {!isBatchMode && (
                <button
                  onClick={runAutoAnalysis}
                  disabled={!selectedModel || !refImage || appState === AppState.ANALYZING}
                  className={`w-full py-3 text-[10px] font-bold uppercase border transition-all
                                ${(!selectedModel || !refImage) ? 'border-zinc-800 text-zinc-700' :
                      appState === AppState.ANALYZING ? 'border-orange-500 text-orange-500 animate-pulse' : 'border-zinc-500 text-zinc-300 hover:border-white hover:text-white'}`}
                >
                  {appState === AppState.ANALYZING ? '[ ANALIZANDO... ]' : '[ EJECUTAR ANALISIS DE FUSIÓN ]'}
                </button>
              )}

              {isBatchMode && (
                <div className="w-full py-3 text-[10px] font-bold uppercase border border-zinc-800 text-zinc-500 text-center">
                    // MODO LOTE ACTIVO: {queue.length} IMÁGENES
                </div>
              )}

              {/* JSON DISPLAY */}
              <div className="flex flex-col gap-1 h-64">
                <label className="text-[9px] text-zinc-500 uppercase flex justify-between">
                  <span>PAYLOAD GENERADO {isBatchMode && "(LOTE)"}</span>
                </label>
                <div className="w-full bg-zinc-950 border border-zinc-800 p-3 text-[9px] font-mono text-zinc-400 overflow-auto h-full whitespace-pre-wrap leading-tight">
                  {isBatchMode ? `// COLA DE PROCESAMIENTO:\n${JSON.stringify(queue.map(q => ({ id: q.id, status: q.status })), null, 2)}` :
                    generatedPayload ? JSON.stringify(generatedPayload, null, 2) :
                      (appState === AppState.ANALYZING ? "..." : "// ESPERANDO ANALISIS...")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COL 3: OUTPUT */}
        <section className={`flex flex-col h-full bg-black/50 relative ${!generatedPayload && !isBatchMode ? 'pointer-events-none' : ''}`}>
          {/* LOCK OVERLAY when no payload generated */}
          {!generatedPayload && !isBatchMode && (
            <div className="absolute inset-0 bg-black/80 z-30 backdrop-blur-md" />
          )}
          <div className="p-3 border-b border-zakra-border bg-zinc-900/20 sticky top-0 backdrop-blur-sm z-10">
            <h2 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${generatedPayload ? 'bg-green-500 text-black' : 'bg-zinc-700 text-zinc-400'}`}>3</span>
              <span className={generatedPayload ? 'text-white' : 'text-zinc-600'}>RESULTADO FINAL</span>
            </h2>
          </div>

          <div className="flex-grow p-4 flex flex-col overflow-auto">
            <div className="flex-grow border border-zinc-800 bg-zinc-950 flex items-center justify-center relative overflow-auto min-h-[300px]">
              {/* Grid Pattern */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

              {isBatchMode ? (
                // BATCH RESULT GRID
                <div className="w-full h-full p-4 grid grid-cols-2 gap-4 content-start overflow-y-auto relative z-10">
                  {queue.map(q => (
                    <div key={q.id} className="flex flex-col gap-1">
                      <div className="aspect-[4/5] bg-zinc-900 border border-zinc-800 relative">
                        {q.resultImage ? (
                          <img src={q.resultImage} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            {q.status === 'ERROR' ? <AlertCircle className="text-red-900" /> :
                              q.status === 'COMPLETED' ? <CheckCircle2 className="text-green-900" /> :
                                <div className="w-2 h-2 bg-zinc-800 rounded-full" />}
                          </div>
                        )}

                        {/* Status Overlay */}
                        <div className="absolute top-2 right-2">
                          {q.status === 'GENERATING' && <Loader2 className="animate-spin text-green-500 w-4 h-4 shadow-black drop-shadow-md" />}
                          {q.status === 'ANALYZING' && <Loader2 className="animate-spin text-orange-500 w-4 h-4 shadow-black drop-shadow-md" />}
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className={`text-[8px] uppercase font-bold ${q.status === 'COMPLETED' ? 'text-green-500' :
                          q.status === 'ERROR' ? 'text-red-500' : 'text-zinc-600'
                          }`}>
                          {q.status}
                        </span>
                        {q.resultImage && (
                          <a href={q.resultImage} download={`batch_${q.id}.png`} className="text-zinc-500 hover:text-white">
                            <Download size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // SINGLE IMAGE RESULT
                generatedImage ? (
                  <img src={generatedImage} alt="Result" className="relative z-10 max-w-full object-contain shadow-2xl" style={{ maxHeight: '60vh' }} />
                ) : (
                  <div className="text-center z-10">
                    {appState === AppState.GENERATING ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-2 h-2 bg-white animate-ping"></div>
                        <span className="text-[10px] uppercase tracking-widest text-white">PROCESANDO SECUENCIA...</span>
                      </div>
                    ) : appState === AppState.ERROR ? (
                      <span className="text-xs text-red-500 font-bold uppercase">{errorMsg || "ERROR"}</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-zinc-600">SIN SEÑAL DE VIDEO</span>
                    )}
                  </div>
                )
              )}
            </div>

            {/* DOWNLOAD BUTTONS */}
            {isBatchMode ? (
              <button
                onClick={handleDownloadBatchZip}
                disabled={!queue.some(q => q.status === 'COMPLETED')}
                className="mt-3 w-full py-2 text-xs font-bold tracking-[0.15em] uppercase border border-blue-500 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
              >
                [ DESCARGAR ZIP LOTE ]
              </button>
            ) : (
              generatedImage && (
                <button
                  onClick={handleDownload}
                  className="mt-3 w-full py-2 text-xs font-bold tracking-[0.15em] uppercase border border-green-500 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all"
                >
                  [ DESCARGAR IMAGEN ]
                </button>
              )
            )}

            {/* RESOLUTION & ASPECT RATIO SELECTORS */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-zinc-500 uppercase">RESOLUCIÓN</label>
                <select
                  value={selectedResolution}
                  onChange={(e) => setSelectedResolution(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-white"
                >
                  {RESOLUTIONS.map(res => (
                    <option key={res} value={res}>{res === 'AUTO' ? 'AUTO (Modelo Elige)' : res}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-zinc-500 uppercase">ASPECT RATIO</label>
                <select
                  value={selectedAspectRatio}
                  onChange={(e) => setSelectedAspectRatio(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 p-2 text-xs text-white outline-none focus:border-white"
                >
                  {ASPECT_RATIOS.map(ratio => (
                    <option key={ratio} value={ratio}>{ratio === 'AUTO' ? 'AUTO (Modelo Elige)' : ratio}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* EXECUTE BUTTON */}
            {isBatchMode ? (
              <button
                onClick={startBatch}
                disabled={!queue.some(q => q.status === 'PENDING') && !queue.some(q => q.status === 'ERROR')}
                className={`mt-4 w-full py-4 text-xs font-bold tracking-[0.2em] uppercase border transition-all
                        ${!queue.some(q => q.status === 'PENDING')
                    ? 'bg-zinc-900/50 text-zinc-600 border-zinc-800'
                    : 'bg-white text-black border-white hover:bg-zinc-200'}`}
              >
                [ INICIAR PROCESAMIENTO POR LOTES ]
              </button>
            ) : (
              <button
                onClick={handleExecute}
                disabled={appState === AppState.GENERATING || !generatedPayload}
                className={`mt-4 w-full py-4 text-xs font-bold tracking-[0.2em] uppercase border transition-all
                              ${appState === AppState.GENERATING || !generatedPayload
                    ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                    : 'bg-white text-black border-white hover:bg-zinc-200 active:scale-[0.99]'}`
                }
              >
                {appState === AppState.GENERATING ? '[ EJECUTANDO... ]' : '[ INICIAR SECUENCIA DE GENERADO ]'}
              </button>
            )}
          </div>
        </section>

      </main>

      {/* CREATE MODEL MODAL */}
      <ModelModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchModelos}
      />

      {/* EDIT NAME MODAL */}
      {editingModel && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-6 w-full max-w-md">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-white">// EDITAR NOMBRE</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 p-3 text-sm text-white mb-4 outline-none focus:border-white"
              placeholder="Ej: Aisah, Sofia..."
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="flex-1 py-2 text-xs font-bold uppercase bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                [ GUARDAR ]
              </button>
              <button
                onClick={() => { setEditingModel(null); setEditName(''); }}
                className="flex-1 py-2 text-xs font-bold uppercase border border-zinc-600 text-zinc-400 hover:border-white hover:text-white"
              >
                [ CANCELAR ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmModel && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-600 p-6 w-full max-w-md">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-red-500">// CONFIRMAR ELIMINACIÓN</h3>
            <p className="text-sm text-zinc-400 mb-2">
              ¿Estás seguro de que deseas eliminar el modelo:
            </p>
            <p className="text-white font-bold mb-4 uppercase">"{deleteConfirmModel.model_name}"?</p>
            <p className="text-[10px] text-zinc-500 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2 text-xs font-bold uppercase bg-red-600 text-white hover:bg-red-500 disabled:bg-zinc-700"
              >
                {isDeleting ? '[ ELIMINANDO... ]' : '[ SÍ, ELIMINAR ]'}
              </button>
              <button
                onClick={() => setDeleteConfirmModel(null)}
                disabled={isDeleting}
                className="flex-1 py-2 text-xs font-bold uppercase border border-zinc-600 text-zinc-400 hover:border-white hover:text-white disabled:opacity-50"
              >
                [ CANCELAR ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-6 w-full max-w-lg">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6 text-white">⚙ AJUSTES</h3>

            <div className="mb-6">
              <label className="text-[10px] text-zinc-500 uppercase block mb-2">API KEY DE GEMINI</label>
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 p-3 text-sm text-white mb-2 outline-none focus:border-white font-mono"
                placeholder="AIzaSy..."
              />
              <p className="text-[9px] text-zinc-600">
                Tu API Key se guarda localmente en tu navegador. Puedes obtener una nueva en{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" className="text-blue-400 hover:underline">
                  aistudio.google.com
                </a>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveApiKey}
                className="flex-1 py-3 text-xs font-bold uppercase bg-white text-black hover:bg-zinc-200"
              >
                [ GUARDAR CAMBIOS ]
              </button>
              <button
                onClick={() => { setShowSettings(false); setTempApiKey(''); }}
                className="flex-1 py-3 text-xs font-bold uppercase border border-zinc-600 text-zinc-400 hover:border-white hover:text-white"
              >
                [ CANCELAR ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERROR MODAL */}
      {appState === AppState.ERROR && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-red-600/50 p-8 w-full max-w-lg shadow-[0_0_50px_rgba(220,38,38,0.2)] text-center relative overflow-hidden">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ff0000 0, #ff0000 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="text-red-500 mb-4 animate-pulse">
                <AlertCircle size={48} />
              </div>

              <h3 className="text-xl font-bold uppercase tracking-[0.2em] mb-2 text-red-500">
                {errorMsg === "CONTENIDO_BLOQUEADO_SEGURIDAD" ? "CONTENIDO BLOQUEADO" :
                  errorMsg === "QUOTA_API_AGOTADA" ? "LÍMITE DE API ALCANZADO" :
                    "ERROR DEL SISTEMA"}
              </h3>

              <div className="h-px w-24 bg-red-800 my-4"></div>

              <p className="text-xs text-zinc-400 font-mono mb-8 uppercase leading-relaxed max-w-sm">
                {errorMsg === "CONTENIDO_BLOQUEADO_SEGURIDAD" ? (
                  <>
                    El sistema de seguridad ha detectado contenido que viola las políticas de uso (posible contenido sexual, violento o explícito).
                    <br /><br />
                    <span className="text-white">POR FAVOR, UTILIZA IMÁGENES DE REFERENCIA APROPIADAS.</span>
                  </>
                ) : errorMsg === "QUOTA_API_AGOTADA" ? (
                  <>
                    Has agotado la cuota gratuita de tu API Key de Gemini.
                    <br /><br />
                    <span className="text-white">VE A AJUSTES ⚙ Y ACTUALIZA TU API KEY PARA CONTINUAR.</span>
                  </>
                ) : (
                  <>
                    {errorMsg || "Ha ocurrido un error inesperado en el procesamiento."}
                    <br /><br />
                    Revisa la consola para más detalles o intenta nuevamente.
                  </>
                )}
              </p>

              <button
                onClick={() => setAppState(AppState.IDLE)}
                className="px-8 py-3 bg-red-600/10 border border-red-600 text-red-500 hover:bg-red-600 hover:text-white uppercase text-xs font-bold tracking-widest transition-all"
              >
                [ ENTENDIDO ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
};

export default App;