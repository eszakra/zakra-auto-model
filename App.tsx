import React, { useState, useEffect, useRef } from 'react';
import { supabase, uploadBase64Image } from './services/supabaseClient';
import { constructPayload, generateIndustrialImage } from './services/geminiService';
import { AppState, ModeloBase } from './types';
import ModelModal from './components/ModelModal';
import HistoryModal from './components/HistoryModal';
import { RefreshCcw, Plus, AlertCircle, Cpu, Calendar } from 'lucide-react';

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
  const [fileInputRef] = React.useState(useRef<HTMLInputElement>(null)); // Fix ref usage
  // NEW: Store the generated payload instead of separate inputs
  const [generatedPayload, setGeneratedPayload] = useState<any | null>(null);

  // --- COL 3: OUTPUT ---
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // --- RENDER OPTIONS ---
  const [selectedResolution, setSelectedResolution] = useState<string>('AUTO');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('1:1');

  const RESOLUTIONS = ['AUTO', '1K', '2K', '4K'];
  const ASPECT_RATIOS = ['AUTO', '1:1', '4:3', '3:4', '16:9', '9:16'];

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

  // --- UPLOAD & AUTO-ANALYSIS LOGIC ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefImage(reader.result as string);
        // Auto trigger analysis if model selected, else user must trigger
        setGeneratedPayload(null);
      };
      reader.readAsDataURL(file);
    }
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
              className={`aspect-square w-full border border-dashed ${refImage ? 'border-white bg-zinc-900' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900'} relative flex flex-col items-center justify-center cursor-pointer transition-all group`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

              {refImage ? (
                <img src={refImage} alt="Reference" className="h-full w-full object-contain p-2" />
              ) : (
                <div className="text-center p-4">
                  <div className="text-4xl text-zinc-700 font-light mb-2 group-hover:text-white transition-colors">+</div>
                  <span className="text-[9px] text-zinc-500 group-hover:text-white uppercase tracking-widest block">SUBIR REFERENCIA</span>
                </div>
              )}
            </div>

            {/* ANALYSIS TRIGGER AND OUTPUT */}
            <div className="flex flex-col gap-2">
              {/* ANALYSIS BUTTON */}
              <button
                onClick={runAutoAnalysis}
                disabled={!selectedModel || !refImage || appState === AppState.ANALYZING}
                className={`w-full py-3 text-[10px] font-bold uppercase border transition-all
                              ${(!selectedModel || !refImage) ? 'border-zinc-800 text-zinc-700' :
                    appState === AppState.ANALYZING ? 'border-orange-500 text-orange-500 animate-pulse' : 'border-zinc-500 text-zinc-300 hover:border-white hover:text-white'}`}
              >
                {appState === AppState.ANALYZING ? '[ ANALIZANDO... ]' : '[ EJECUTAR ANALISIS DE FUSIÓN ]'}
              </button>

              {/* JSON DISPLAY */}
              <div className="flex flex-col gap-1 h-64">
                <label className="text-[9px] text-zinc-500 uppercase flex justify-between">
                  <span>PAYLOAD GENERADO</span>
                </label>
                <div className="w-full bg-zinc-950 border border-zinc-800 p-3 text-[9px] font-mono text-zinc-400 overflow-auto h-full whitespace-pre-wrap leading-tight">
                  {generatedPayload ? JSON.stringify(generatedPayload, null, 2) :
                    (appState === AppState.ANALYZING ? "..." : "// ESPERANDO ANALISIS...")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COL 3: OUTPUT */}
        <section className={`flex flex-col h-full bg-black/50 relative ${!generatedPayload ? 'pointer-events-none' : ''}`}>
          {/* LOCK OVERLAY when no payload generated */}
          {!generatedPayload && (
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

              {generatedImage ? (
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
              )}
            </div>

            {/* DOWNLOAD BUTTON - Only show when image is ready */}
            {generatedImage && (
              <button
                onClick={handleDownload}
                className="mt-3 w-full py-2 text-xs font-bold tracking-[0.15em] uppercase border border-green-500 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all"
              >
                [ DESCARGAR IMAGEN ]
              </button>
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