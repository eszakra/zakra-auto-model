import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { supabase, uploadBase64Image } from './services/supabaseClient';
import { constructPayload, generateIndustrialImage } from './services/geminiService';
import { AppState, ModeloBase, QueueItem } from './types';
import ModelModal from './components/ModelModal';
import { useAuth } from './contexts/AuthContext';
import { RefreshCcw, Plus, AlertCircle, Cpu, Calendar, CheckCircle2, Loader2, Download, Play, Layers, ScanSearch, X, Check, ArrowLeft, CreditCard, Crown, Shield } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Lazy load heavy components
const HistoryModal = lazy(() => import('./components/HistoryModal'));
const AdminPanel = lazy(() => import('./components/AdminPanelExtended').then(m => ({ default: m.AdminPanel })));

interface AppProps {
  onBackToLanding?: () => void;
}

const App: React.FC<AppProps> = ({ onBackToLanding }) => {
  // --- AUTH & CONFIG ---
  const { user, loading: userLoading, hasEnoughCredits, useCredits } = useAuth();
  // API key from Supabase - fetched dynamically
  const [apiKey, setApiKey] = useState<string>('');
  const [hasAccess, setHasAccess] = useState(false);
  const [loadingApiKey, setLoadingApiKey] = useState(true);
  const [userLoadError, setUserLoadError] = useState(false);

  // --- APP STATE ---
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- COL 1: LIBRARY ---
  const [modelos, setModelos] = useState<ModeloBase[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModeloBase | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

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
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // NEW: Store the generated payload instead of separate inputs
  const [generatedPayload, setGeneratedPayload] = useState<any | null>(null);
  // NEW: Editable payload string
  const [payloadJsonString, setPayloadJsonString] = useState<string>('');

  // Sync generatedPayload to the editable string
  useEffect(() => {
    if (generatedPayload) {
      setPayloadJsonString(JSON.stringify(generatedPayload, null, 2));
    } else {
      setPayloadJsonString('');
    }
  }, [generatedPayload]);

  // --- COL 3: OUTPUT ---
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // --- RENDER OPTIONS ---
  const [selectedResolution, setSelectedResolution] = useState<string>('AUTO');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('1:1');

  // Filter resolutions based on user plan
  const getAvailableResolutions = () => {
    const plan = user?.plan_type || 'free';
    if (plan === 'free' || plan === 'basic') {
      return ['AUTO', '1K']; // Free and Basic only get AUTO and 1K
    }
    return ['AUTO', '1K', '2K', '4K']; // Pro and Premium get all
  };
  
  const RESOLUTIONS = getAvailableResolutions();
  // Gemini 3 Pro Image supported aspect ratios (per official docs)
  const ASPECT_RATIOS = ['AUTO', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

  // Download handler
  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `reed_${selectedModel?.model_name || 'output'}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    // Fetch API key from Supabase
    fetchApiKey();
    fetchModelos();
  }, []);

  // Check if user fails to load after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user && !userLoading) {
        setUserLoadError(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [user, userLoading]);

  // Reset resolution if user changes plan and selected resolution is not available
  useEffect(() => {
    const plan = user?.plan_type || 'free';
    if ((plan === 'free' || plan === 'basic') && (selectedResolution === '2K' || selectedResolution === '4K')) {
      setSelectedResolution('AUTO');
    }
  }, [user?.plan_type, selectedResolution]);

  // Fetch API key from Supabase
  const fetchApiKey = async () => {
    try {
      setLoadingApiKey(true);
      
      // Try to get from RPC function first
      const { data, error } = await supabase.rpc('get_api_key');
      
      if (error) {
        console.error('Error fetching API key from RPC:', error);
        // Fallback to environment variable
        const envKey = import.meta.env.VITE_API_KEY || '';
        setApiKey(envKey);
        setHasAccess(!!envKey);
      } else if (data) {
        setApiKey(data);
        setHasAccess(true);
      } else {
        // Fallback to environment variable
        const envKey = import.meta.env.VITE_API_KEY || '';
        setApiKey(envKey);
        setHasAccess(!!envKey);
      }
    } catch (err) {
      console.error('Failed to fetch API key:', err);
      // Fallback to environment variable
      const envKey = import.meta.env.VITE_API_KEY || '';
      setApiKey(envKey);
      setHasAccess(!!envKey);
    } finally {
      setLoadingApiKey(false);
    }
  };

  // Get current API key
  const getCurrentApiKey = () => {
    if (!apiKey) {
      console.error('No API key configured');
      return '';
    }
    return apiKey;
  };

  // Refresh API key (called from AdminPanel after update)
  const refreshApiKey = async () => {
    await fetchApiKey();
  };

  // Expose refresh function to window for AdminPanel access
  useEffect(() => {
    (window as any).refreshAppApiKey = refreshApiKey;
    return () => {
      delete (window as any).refreshAppApiKey;
    };
  }, []);

  const fetchModelos = async () => {
    setLoadingModels(true);
    // Only fetch models for the current user
    const { data, error } = await supabase
      .from('saved_models')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
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

    if (queue.length > 0) {
      const newItems: QueueItem[] = Array.from(files).map((file: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'PENDING'
      }));
      setQueue(prev => [...prev, ...newItems]);
      e.target.value = '';
      return;
    }

    setGeneratedPayload(null);
    setGeneratedImage(null);
    setAppState(AppState.IDLE);
    setRefImage(null);

    if (files.length === 1) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      const newQueue: QueueItem[] = Array.from(files).map((file: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'PENDING'
      }));
      setQueue(newQueue);
    }

    e.target.value = '';
  };

  // Remove item from queue
  const removeQueueItem = (itemId: string) => {
    setQueue(prev => prev.filter(q => q.id !== itemId));
    if (selectedQueueId === itemId) setSelectedQueueId(null);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    if (queue.length > 0) {
      const newItems: QueueItem[] = Array.from(files).map((file: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'PENDING'
      }));
      setQueue(prev => [...prev, ...newItems]);
      return;
    }

    setGeneratedPayload(null);
    setGeneratedImage(null);
    setAppState(AppState.IDLE);
    setRefImage(null);

    if (files.length === 1) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      const newQueue: QueueItem[] = Array.from(files).map((file: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'PENDING'
      }));
      setQueue(newQueue);
    }
  };

  // Analyze a single batch item (Step A)
  const analyzeBatchItem = async (itemId: string) => {
    setQueue(prev => prev.map(item => item.id === itemId ? { ...item, status: 'ANALYZING' } : item));
    try {
      const item = queue.find(q => q.id === itemId);
      if (!item || !selectedModel) return;

      const currentKey = getCurrentApiKey();
      const base64Ref = await fileToBase64(item.file);
      const { generateUnifiedPayload } = await import('./services/geminiService');
      const payload = await generateUnifiedPayload(currentKey, selectedModel.image_url, base64Ref);

      setQueue(prev => prev.map(q => q.id === itemId ? { ...q, status: 'ANALYZED', payload } : q));
    } catch (e: any) {
      console.error(e);
      setQueue(prev => prev.map(q => q.id === itemId ? { ...q, status: 'ERROR', error: e.message } : q));
    }
  };

  const analyzeAllBatchItems = async () => {
    const pendingItems = queue.filter(q => q.status === 'PENDING');
    if (pendingItems.length === 0) return;

    for (const item of pendingItems) {
      await analyzeBatchItem(item.id);
    }
  };

  const startBatchGeneration = async () => {
    if (!selectedModel) { alert("SELECT MODEL?"); return; }

    const readyItems = queue.filter(q => q.status === 'ANALYZED');
    if (readyItems.length === 0) {
      alert("FIRST YOU MUST ANALYZE AT LEAST ONE IMAGE (SELECT AND ANALYZE)");
      return;
    }

    for (const item of readyItems) {
      await generateBatchItem(item);
    }
  };

  // Generate image for a single analyzed item (Step B)
  const generateBatchItem = async (item: QueueItem) => {
    setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'GENERATING' } : q));

    try {
      if (!selectedModel) throw new Error("No model selected");
      if (!item.payload) throw new Error("No payload found");

      // Check credits before generating
      if (!hasEnoughCredits(1)) {
        throw new Error("Insufficient credits. Please upgrade your plan or purchase more credits.");
      }

      const currentKey = getCurrentApiKey();
      const { generateIndustrialImage } = await import('./services/geminiService');

      const resultBase64 = await generateIndustrialImage(
        currentKey,
        item.payload,
        selectedModel.image_url,
        selectedResolution === 'AUTO' ? undefined : selectedResolution,
        selectedAspectRatio === 'AUTO' ? undefined : selectedAspectRatio,
        user?.plan_type
      );

      // Deduct credits after successful generation
      const creditsUsed = await useCredits(1, `Batch generation with model: ${selectedModel.model_name || 'unknown'}`);
      if (!creditsUsed) {
        console.warn('Failed to deduct credits, but image was generated');
      }

      const fileName = `batch_${Date.now()}_${item.id}.png`;
      const publicUrl = await uploadBase64Image(resultBase64, 'generations', fileName);
      await supabase.from('generation_logs').insert({
        user_id: user?.id,
        model_name: selectedModel.model_name,
        image_url: publicUrl,
        prompt: JSON.stringify(item.payload),
        aspect_ratio: selectedAspectRatio,
        resolution: selectedResolution,
        credits_used: 1,
        status: 'success'
      });

      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'COMPLETED', resultImage: resultBase64 } : q));

    } catch (e: any) {
      console.error(e);
      // Check if it's a resolution error
      let errorMsg = e.message;
      if (e.message?.includes('RESOLUTION_NOT_ALLOWED')) {
        errorMsg = 'Your plan only supports up to 1K. Upgrade to Pro/Premium for higher resolutions.';
      }
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'ERROR', error: errorMsg } : q));
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

  const handleDownloadBatchZip = async () => {
    const zip = new JSZip();
    const completedItems = queue.filter(q => q.status === 'COMPLETED' && q.resultImage);
    if (completedItems.length === 0) {
      alert("No completed images to download");
      return;
    }
    
    try {
      completedItems.forEach((item, index) => {
        let imgData = item.resultImage!;
        
        // Check if it's a data URL (base64 with prefix)
        if (imgData.includes(',')) {
          imgData = imgData.split(',')[1];
        }
        
        // Check if it's already base64 without prefix
        if (!imgData) {
          console.error(`Empty image data for item ${index}`);
          return;
        }
        
        zip.file(`reed_batch_${index + 1}.png`, imgData, { base64: true });
      });
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `reed_batch_${Date.now()}.zip`);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      alert('Error creating ZIP file. Please try again.');
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
      alert("ERROR EDITING: " + error.message);
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
      alert("ERROR DELETING: " + error.message);
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
      alert("SELECT MODEL AND REFERENCE FIRST");
      return;
    }

    // Check credits before analysis (costs 1 credit)
    if (!hasEnoughCredits(1)) {
      alert("INSUFFICIENT CREDITS: You need at least 1 credit to run the analysis. Please upgrade your plan or purchase more credits.");
      return;
    }

    // Deduct credits for analysis
    const creditsUsed = await useCredits(1, `Fusion analysis with model: ${selectedModel.model_name || 'unknown'}`);
    if (!creditsUsed) {
      alert("Failed to process credits. Please try again.");
      return;
    }

    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    setGeneratedPayload(null);

    try {
      const currentKey = getCurrentApiKey();
      const { generateUnifiedPayload } = await import('./services/geminiService');

      const payload = await generateUnifiedPayload(currentKey, selectedModel.image_url, refImage);
      setGeneratedPayload(payload);
      setAppState(AppState.IDLE);

    } catch (e: any) {
      console.error(e);
      setAppState(AppState.ERROR);
      setErrorMsg("ANALYSIS FAILED: " + e.message);
    }
  };

  // --- GENERATION LOGIC ---
  const handleExecute = async () => {
    if (!payloadJsonString && !generatedPayload) {
      alert("FIRST YOU MUST PERFORM THE ANALYSIS (STEP 2)");
      return;
    }

    // Check credits before generating
    if (!hasEnoughCredits(1)) {
      alert("INSUFFICIENT CREDITS: You need at least 1 credit to generate images. Please upgrade your plan or purchase more credits.");
      return;
    }

    let finalPayload: any;
    try {
      finalPayload = JSON.parse(payloadJsonString);
    } catch (e) {
      alert("INVALID JSON: Please correct the prompt format before generating.");
      return;
    }

    setAppState(AppState.GENERATING);
    setErrorMsg(null);
    const currentKey = getCurrentApiKey();

    try {
      const { generateIndustrialImage } = await import('./services/geminiService');
      const result = await generateIndustrialImage(
        currentKey,
        finalPayload,
        selectedModel?.image_url || "",
        selectedResolution === 'AUTO' ? undefined : selectedResolution,
        selectedAspectRatio === 'AUTO' ? undefined : selectedAspectRatio,
        user?.plan_type
      );
      setGeneratedImage(result);
      setAppState(AppState.COMPLETE);

      // Deduct credits after successful generation
      const creditsUsed = await useCredits(1, `Generated image with model: ${selectedModel?.model_name || 'unknown'}`);
      if (!creditsUsed) {
        console.warn('Failed to deduct credits, but image was generated');
      }

      saveToHistory(result, finalPayload);

    } catch (error: any) {
      setAppState(AppState.ERROR);
      // Check if it's a resolution error
      if (error.message?.includes('RESOLUTION_NOT_ALLOWED')) {
        setErrorMsg('ANALYSIS FAILED: Your current plan only supports up to 1K resolution. Please upgrade to Pro or Premium to access 2K and 4K resolutions.');
      } else {
        setErrorMsg(error.message);
      }
    }
  };

  const saveToHistory = async (base64Image: string, payload: any) => {
    try {
      if (!selectedModel || !user) return;

      const fileName = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
      const publicUrl = await uploadBase64Image(base64Image, 'generations', fileName);

      await supabase.from('generation_logs').insert({
        user_id: user.id,
        model_name: selectedModel.model_name,
        image_url: publicUrl,
        prompt: JSON.stringify(payload),
        aspect_ratio: selectedAspectRatio,
        resolution: selectedResolution,
        credits_used: 1,
        status: 'success'
      });
      console.log('Saved to history');
    } catch (err) {
      console.error('Failed to save history:', err);
    }
  };

  // Back to landing
  const handleBackToLanding = () => {
    if (onBackToLanding) {
      onBackToLanding();
    } else {
      window.location.reload();
    }
  };

  // --- RENDER HELPERS ---
  if (loadingApiKey) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-reed-red mx-auto mb-4" />
          <p className="text-sm font-medium">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png" alt="REED" className="h-16 w-auto mx-auto mb-6" />
          <div className="text-reed-red mb-4"><AlertCircle size={48} className="mx-auto" /></div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">API Key Not Configured</h1>
          <p className="text-[var(--text-secondary)] mb-8">The API key is not configured. Please contact the administrator.</p>
          
          <button 
            onClick={handleBackToLanding}
            className="w-full px-6 py-3 border-2 border-[var(--border-color)] text-[var(--text-secondary)] font-semibold rounded-lg hover:border-[var(--text-muted)] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-[var(--border-color)] flex justify-between items-center px-4 lg:px-6 bg-[var(--bg-primary)] z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBackToLanding}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-reed-red transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Back</span>
          </button>
          <div className="w-px h-6 bg-[var(--border-color)] mx-2" />
          <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png" alt="REED" className="h-6 w-auto" />
          <span className="text-sm font-bold tracking-wide text-[var(--text-primary)] hidden sm:inline">REED GENERATOR</span>
          <div className={`w-2 h-2 rounded-full ml-2 ${appState === AppState.GENERATING || appState === AppState.ANALYZING ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Credits Display - More Prominent */}
          {userLoading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-full">
              <Loader2 className="w-4 h-4 text-[var(--text-muted)] animate-spin" />
              <span className="text-sm text-[var(--text-muted)]">Loading...</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-reed-red/10 to-reed-red/5 border border-reed-red/20 rounded-full shadow-sm">
              {user.plan_type === 'premium' ? (
                <>
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">Unlimited</span>
                  <span className="text-xs text-amber-500 font-medium bg-amber-100 px-2 py-0.5 rounded-full">PREMIUM</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 text-reed-red" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">{user.credits}</span>
                  <span className="text-xs text-[var(--text-muted)]">credits</span>
                  <span className="text-xs text-reed-red font-medium bg-reed-red/10 px-2 py-0.5 rounded-full uppercase">{user.plan_type}</span>
                </>
              )}
            </div>
          ) : userLoadError ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
              <AlertCircle className="w-4 h-4 text-[#a11008]" />
              <span className="text-sm text-[#a11008]">Auth Error</span>
            </div>
          ) : null}

          <button
            onClick={() => setShowHistory(true)}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>

          {/* Admin Button - Only for admins */}
          {user?.is_admin && (
            <button
              onClick={() => setShowAdmin(true)}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
        </div>
      </header>

      {/* 3-COLUMN GRID */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-color)] overflow-hidden">

        {/* COL 1: LIBRARY */}
        <section className="flex flex-col h-full bg-[var(--bg-secondary)] overflow-y-auto">
          <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)] sticky top-0 z-10 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedModel ? 'bg-green-500 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>1</span>
              <span>Select Model</span>
            </h2>
            <button onClick={fetchModelos} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><RefreshCcw size={14} /></button>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {/* GRID OF MODELS */}
            {loadingModels ? (
              <div className="text-sm text-[var(--text-muted)] text-center py-8">Loading models...</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {modelos.map(modelo => (
                  <div
                    key={modelo.id}
                    onClick={() => setSelectedModel(modelo)}
                    className={`cursor-pointer border-2 rounded-lg p-2 transition-all relative group ${selectedModel?.id === modelo.id ? 'border-reed-red bg-reed-red/5' : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'}`}
                  >
                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={(e) => handleStartEdit(modelo, e)}
                        className="w-6 h-6 bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-reed-red hover:text-reed-red rounded text-xs flex items-center justify-center transition-colors"
                        title="Edit name"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => handleStartDelete(modelo, e)}
                        className="w-6 h-6 bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-red-500 hover:text-[#a11008] rounded flex items-center justify-center transition-colors"
                        title="Delete model"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="aspect-square bg-[var(--bg-secondary)] rounded mb-2 overflow-hidden">
                      <img src={modelo.image_url} alt={modelo.model_name} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs font-semibold truncate uppercase text-[var(--text-primary)]">{modelo.model_name}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ADD BUTTON */}
            <button
              onClick={() => setShowModal(true)}
              className="w-full py-4 border-2 border-dashed border-[var(--border-color)] hover:border-reed-red hover:text-reed-red text-[var(--text-muted)] text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={16} /> Add New Model
            </button>

            {selectedModel && (
              <div className="mt-2 text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border-color)]">
                Selected: <span className="font-semibold text-[var(--text-primary)]">{selectedModel.model_name}</span>
              </div>
            )}
          </div>
        </section>

        {/* COL 2: REFERENCE & ANALYSIS */}
        <section className="flex flex-col h-full bg-[var(--bg-secondary)] overflow-hidden relative">
          {/* LOCK OVERLAY when no model selected */}
          {!selectedModel && (
            <div className="absolute inset-0 bg-[var(--bg-primary)] z-[100] flex items-center justify-center">
              <div className="text-center">
                <div className="text-[var(--text-muted)] mb-2"><Layers size={32} className="mx-auto" /></div>
                <p className="text-sm text-[var(--text-muted)]">Select a model first</p>
              </div>
            </div>
          )}
          
          <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)] sticky top-0 z-10">
            <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedModel ? 'bg-green-500 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>2</span>
              <span className={selectedModel ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>Upload Reference & Analyze</span>
            </h2>
          </div>

          <div className="p-4 flex flex-col gap-6">
            {/* DROP ZONE */}
            <div
              className={`${isBatchMode ? 'h-[500px]' : 'aspect-square'} w-full border-2 border-dashed rounded-xl ${refImage || isBatchMode ? 'border-reed-red bg-reed-red/5' : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'} relative flex flex-col items-center justify-center transition-all group overflow-hidden ${!isBatchMode ? 'cursor-pointer' : ''}`}
              onClick={() => !isBatchMode && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />

              {isBatchMode ? (
                <div className="w-full h-full p-2 grid grid-cols-3 gap-2 overflow-y-auto content-start">
                  {queue.map(q => (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQueueId(q.id)}
                      className={`relative aspect-square border-2 rounded-lg cursor-pointer transition-all group/item ${selectedQueueId === q.id ? 'border-reed-red bg-reed-red/5' : 'border-[var(--border-color)]'}`}
                    >
                      <img src={q.previewUrl} className="w-full h-full object-cover rounded" />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeQueueItem(q.id); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-red-500 hover:text-[#a11008] rounded flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all z-30"
                        title="Remove"
                      >
                        <X size={10} />
                      </button>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {q.status === 'PENDING' && <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full" />}
                        {q.status === 'ANALYZING' && <Loader2 className="animate-spin text-amber-500 w-5 h-5" />}
                        {q.status === 'ANALYZED' && (
                          <>
                            <div className="absolute inset-0 border-2 border-amber-500 rounded-lg pointer-events-none z-10" />
                            <Play className="text-amber-500 w-8 h-8 z-20" fill="currentColor" />
                          </>
                        )}
                        {q.status === 'GENERATING' && <Loader2 className="animate-spin text-green-500 w-5 h-5" />}
                        {q.status === 'COMPLETED' && <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><Check className="text-white w-3 h-3" /></div>}
                        {q.status === 'ERROR' && <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><X className="text-white w-3 h-3" /></div>}
                      </div>
                    </div>
                  ))}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer flex items-center justify-center border-2 border-dashed border-[var(--border-color)] text-[var(--text-muted)] text-xs aspect-square rounded-lg hover:border-reed-red hover:text-reed-red transition-colors"
                  >
                    <Plus size={16} />
                  </div>
                </div>
              ) : refImage ? (
                <img src={refImage} alt="Reference" className="h-full w-full object-contain p-2 rounded-lg" />
              ) : (
                <div className="text-center p-4">
                  <div className="text-4xl text-[var(--text-muted)] font-light mb-2 group-hover:text-reed-red transition-colors">+</div>
                  <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-primary)] font-medium">Upload Reference(s)</span>
                </div>
              )}
            </div>

            {/* ANALYSIS TRIGGER AND OUTPUT */}
            <div className="flex flex-col gap-2">
              {!isBatchMode ? (
                <button
                  onClick={runAutoAnalysis}
                  disabled={!selectedModel || !refImage || appState === AppState.ANALYZING}
                  className={`w-full py-3 text-sm font-bold uppercase rounded-lg border-2 transition-all
                    ${(!selectedModel || !refImage) ? 'border-[var(--border-color)] text-[var(--text-muted)]' :
                      appState === AppState.ANALYZING ? 'border-amber-500 text-amber-500 animate-pulse' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-reed-red hover:text-reed-red'}`}
                >
                  {appState === AppState.ANALYZING ? 'Analyzing...' : 'Run Fusion Analysis'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={analyzeAllBatchItems}
                    disabled={!queue.some(q => q.status === 'PENDING')}
                    className={`flex-grow py-3 text-sm font-bold uppercase rounded-lg border-2 transition-all
                      ${!queue.some(q => q.status === 'PENDING') ? 'border-[var(--border-color)] text-[var(--text-muted)]' :
                        'border-amber-500 text-amber-500 hover:bg-amber-500/10'}`}
                  >
                    {queue.some(q => q.status === 'ANALYZING') ? 'Analyzing Batch...' : 'Generate Payloads (Auto)'}
                  </button>
                  {selectedQueueId && queue.find(q => q.id === selectedQueueId)?.status === 'PENDING' && (
                    <button
                      onClick={() => analyzeBatchItem(selectedQueueId)}
                      className="px-3 border-2 border-[var(--border-color)] text-[var(--text-muted)] hover:text-amber-500 hover:border-amber-500 rounded-lg"
                      title="Analyze individually"
                    >
                      1
                    </button>
                  )}
                </div>
              )}

              {isBatchMode && (
                <div className="w-full pb-2 text-xs font-bold uppercase text-[var(--text-muted)] flex justify-between">
                  <span>Batch: {queue.length} images</span>
                  <span>Analyzed: {queue.filter(q => q.status !== 'PENDING' && q.status !== 'ANALYZING').length} / {queue.length}</span>
                </div>
              )}

              {/* JSON DISPLAY */}
              <div className="flex flex-col gap-1 h-64">
                <label className="text-xs text-[var(--text-muted)] uppercase flex justify-between">
                  <span>Generated Payload {isBatchMode && "(Selected Item)"}</span>
                </label>
                
                {isBatchMode ? (
                  <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-xs font-mono text-[var(--text-secondary)] overflow-auto h-full whitespace-pre-wrap leading-tight">
                    {selectedQueueId ?
                      JSON.stringify(queue.find(q => q.id === selectedQueueId)?.payload || { status: queue.find(q => q.id === selectedQueueId)?.status || 'UNKNOWN' }, null, 2)
                      : "// Select an image to view its payload"}
                  </div>
                ) : (
                  <textarea
                    value={payloadJsonString}
                    onChange={(e) => setPayloadJsonString(e.target.value)}
                    placeholder="// Waiting for analysis..."
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-xs font-mono text-[var(--text-secondary)] overflow-auto h-full whitespace-pre-wrap leading-tight resize-none focus:outline-none focus:border-reed-red transition-colors"
                    spellCheck={false}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* COL 3: OUTPUT */}
        <section className="flex flex-col h-full bg-[var(--bg-secondary)] overflow-hidden relative">
          {/* LOCK OVERLAY when no payload generated */}
          {!generatedPayload && !isBatchMode && (
            <div className="absolute inset-0 bg-[var(--bg-primary)] z-[100] flex items-center justify-center">
              <div className="text-center">
                <div className="text-[var(--text-muted)] mb-2"><Cpu size={32} className="mx-auto" /></div>
                <p className="text-sm text-[var(--text-muted)]">Analyze an image first</p>
              </div>
            </div>
          )}
          
          <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)] sticky top-0 z-10">
            <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${generatedPayload ? 'bg-green-500 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>3</span>
              <span className={generatedPayload ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>Final Result</span>
            </h2>
          </div>

          <div className="flex-grow relative min-h-0">
            <div className="absolute inset-4 border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-xl overflow-hidden">
              {isBatchMode ? (
                <div className="w-full p-4 grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto">
                  {queue.map(q => (
                    <div key={q.id} className="flex flex-col gap-1 group relative">
                      <div
                        className={`aspect-[4/5] bg-[var(--bg-secondary)] border-2 rounded-lg ${q.resultImage ? 'border-[var(--border-color)] cursor-zoom-in hover:border-reed-red' : 'border-[var(--border-color)]'} relative overflow-hidden transition-all`}
                        onClick={() => q.resultImage && setLightboxImage(q.resultImage)}
                      >
                        {q.resultImage ? (
                          <>
                            <img src={q.resultImage} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                              <ScanSearch className="text-white w-6 h-6" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                            {q.status === 'ERROR' ? <AlertCircle className="text-[#a11008]" /> :
                              q.status === 'COMPLETED' ? <CheckCircle2 className="text-green-400" /> :
                                q.status === 'GENERATING' ? <Loader2 className="animate-spin text-green-400" /> :
                                  q.status === 'ANALYZED' ? <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" /> :
                                    <div className="w-1 h-1 bg-[var(--text-muted)] rounded-full" />}
                          </div>
                        )}

                        <div className="absolute top-2 right-2 z-10">
                          {q.status === 'GENERATING' && <Loader2 className="animate-spin text-green-500 w-4 h-4" />}
                          {q.status === 'ANALYZING' && <Loader2 className="animate-spin text-amber-500 w-4 h-4" />}
                          {q.status === 'COMPLETED' && <CheckCircle2 className="text-green-500 w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-grow w-full h-full flex items-center justify-center">
                  {generatedImage ? (
                    <img src={generatedImage} alt="Result" className="relative z-10 max-w-full max-h-full object-contain p-4" />
                  ) : (
                    <div className="text-center">
                      {appState === AppState.GENERATING ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 text-reed-red animate-spin" />
                          <span className="text-sm uppercase tracking-wide text-[var(--text-secondary)]">Processing...</span>
                        </div>
                      ) : appState === AppState.ERROR ? (
                        <span className="text-sm text-[#a11008] font-bold uppercase">{errorMsg || "Error"}</span>
                      ) : (
                        <span className="text-sm uppercase tracking-wide text-[var(--text-muted)]">No image generated</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* FIXED FOOTER CONTROLS */}
          <div className="p-4 bg-[var(--bg-primary)] border-t border-[var(--border-color)] z-20">
            {/* DOWNLOAD BUTTONS */}
            {isBatchMode ? (
              <button
                onClick={handleDownloadBatchZip}
                disabled={!queue.some(q => q.status === 'COMPLETED')}
                className="mb-3 w-full py-2 text-sm font-bold tracking-wide uppercase border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download Batch ZIP
              </button>
            ) : (
              generatedImage && (
                <button
                  onClick={handleDownload}
                  className="mb-3 w-full py-2 text-sm font-bold tracking-wide uppercase border-2 border-green-500 text-green-500 rounded-lg hover:bg-green-500/10 transition-all"
                >
                  Download Image
                </button>
              )
            )}

            {/* RESOLUTION & ASPECT RATIO SELECTORS */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-muted)] uppercase font-medium flex items-center gap-1">
                  Resolution
                  {(user?.plan_type === 'free' || user?.plan_type === 'basic') && (
                    <span className="text-[10px] bg-amber-100 text-amber-500 px-1.5 py-0.5 rounded">1K max</span>
                  )}
                </label>
                <select
                  value={selectedResolution}
                  onChange={(e) => setSelectedResolution(e.target.value)}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-2 text-sm text-[var(--text-primary)] outline-none focus:border-reed-red"
                >
                  {RESOLUTIONS.map(res => (
                    <option key={res} value={res}>{res === 'AUTO' ? 'Auto (Model Chooses)' : res}</option>
                  ))}
                </select>
                {(user?.plan_type === 'free' || user?.plan_type === 'basic') && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Upgrade to Pro for 2K/4K
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-muted)] uppercase font-medium">Aspect Ratio</label>
                <select
                  value={selectedAspectRatio}
                  onChange={(e) => setSelectedAspectRatio(e.target.value)}
                  className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-2 text-sm text-[var(--text-primary)] outline-none focus:border-reed-red"
                >
                  {ASPECT_RATIOS.map(ratio => (
                    <option key={ratio} value={ratio}>{ratio === 'AUTO' ? 'Auto (Model Chooses)' : ratio}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* EXECUTE BUTTON */}
            {isBatchMode ? (
              <button
                onClick={startBatchGeneration}
                disabled={!queue.some(q => q.status === 'ANALYZED')}
                className={`w-full py-3 text-sm font-bold tracking-wide uppercase rounded-lg border-2 transition-all
                  ${!queue.some(q => q.status === 'ANALYZED')
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)]'
                    : 'bg-reed-red text-white border-reed-red hover:bg-reed-red-dark'}`}
              >
                Generate Images ({queue.filter(q => q.status === 'ANALYZED').length} Ready)
              </button>
            ) : (
              <button
                onClick={handleExecute}
                disabled={appState === AppState.GENERATING || !generatedPayload}
                className={`w-full py-3 text-sm font-bold tracking-wide uppercase rounded-lg border-2 transition-all
                  ${appState === AppState.GENERATING || !generatedPayload
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] cursor-not-allowed'
                    : 'bg-reed-red text-white border-reed-red hover:bg-reed-red-dark'}`}
              >
                {appState === AppState.GENERATING ? 'Generating...' : 'Start Generation'}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-[var(--text-primary)]">Edit Name</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-[var(--text-primary)] mb-4 outline-none focus:border-reed-red"
              placeholder="e.g., Aisah, Sofia..."
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="flex-1 py-2 text-sm font-bold uppercase bg-reed-red text-white rounded-lg hover:bg-reed-red-dark disabled:bg-[var(--bg-secondary)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setEditingModel(null); setEditName(''); }}
                className="flex-1 py-2 text-sm font-bold uppercase border-2 border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:border-[var(--text-muted)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmModel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-primary)] border border-red-200 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-[#a11008]">Confirm Deletion</h3>
            <p className="text-[var(--text-secondary)] mb-2">Are you sure you want to delete the model:</p>
            <p className="text-[var(--text-primary)] font-bold mb-4 uppercase">"{deleteConfirmModel.model_name}"?</p>
            <p className="text-xs text-[var(--text-muted)] mb-6">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2 text-sm font-bold uppercase bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-[var(--bg-secondary)] transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setDeleteConfirmModel(null)}
                disabled={isDeleting}
                className="flex-1 py-2 text-sm font-bold uppercase border-2 border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ERROR MODAL */}
      {appState === AppState.ERROR && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-primary)] border border-red-200 rounded-xl p-8 w-full max-w-lg shadow-2xl text-center">
            <div className="text-[#a11008] mb-4">
              <AlertCircle size={48} className="mx-auto" />
            </div>

            <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">
              {errorMsg === "CONTENIDO_BLOQUEADO_SEGURIDAD" ? "Content Blocked" :
                errorMsg === "QUOTA_API_AGOTADA" ? "High Demand" :
                  "System Error"}
            </h3>

            <div className="h-px w-24 bg-[var(--border-color)] my-4 mx-auto"></div>

            <p className="text-sm text-[var(--text-secondary)] mb-8">
              {errorMsg === "CONTENIDO_BLOQUEADO_SEGURIDAD" ? (
                <>
                  The security system has detected content that violates usage policies (possible sexual, violent, or explicit content).
                  <br /><br />
                  <span className="text-[var(--text-primary)] font-medium">Please use appropriate reference images.</span>
                </>
              ) : errorMsg === "QUOTA_API_AGOTADA" ? (
                <>
                  Our servers are experiencing high demand right now.
                  <br /><br />
                  <span className="text-[var(--text-primary)] font-medium">We're already working on it. Please try again in a few minutes.</span>
                </>
              ) : (
                <>
                  {errorMsg || "An unexpected error occurred during processing."}
                  <br /><br />
                  Check the console for more details or try again.
                </>
              )}
            </p>

            <button
              onClick={() => setAppState(AppState.IDLE)}
              className="px-8 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg hover:opacity-90 font-semibold transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="fixed top-6 right-6 text-white hover:text-gray-300 z-[80] text-sm uppercase tracking-wide font-medium"
          >
            Close
          </button>

          <img
            src={lightboxImage}
            className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* History Modal */}
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />

      {/* Admin Panel */}
      <AdminPanel
        isOpen={showAdmin}
        onClose={() => setShowAdmin(false)}
      />
    </div>
  );
};

export default App;
