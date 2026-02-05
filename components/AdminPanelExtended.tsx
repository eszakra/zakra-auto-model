import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import {
  Users, CreditCard, TrendingUp, Search, Plus, Minus,
  Crown, Shield, X, Loader2, RefreshCw, ToggleLeft, ToggleRight,
  Settings, Zap, Lock, Key, Eye, EyeOff, CheckCircle, AlertTriangle,
  Image as ImageIcon, Download, Upload, Package, ChevronDown, ChevronUp
} from 'lucide-react';

interface UserWithProfile {
  id: string;
  email: string;
  full_name: string;
  plan_type: string;
  credits: number;
  total_generations: number;
  is_admin: boolean;
  created_at: string;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  user_email?: string;
}

interface FeatureFlag {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
}

interface GenerationLog {
  id: string;
  user_id: string;
  model_name: string;
  image_url: string;
  prompt: string;
  aspect_ratio: string;
  resolution: string;
  credits_used: number;
  status: string;
  created_at: string;
  user_email?: string;
}

interface LoraOrder {
  id: string;
  user_id: string;
  service_id: string;
  service_name: string;
  service_category: string;
  amount: number;
  status: 'processing' | 'ready' | 'delivered';
  photos_uploaded: boolean;
  download_url: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
  user_email?: string;
  user_name?: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { flags, isEnabled, updateFlag, loading: flagsLoading } = useFeatureFlags();
  const [activeTab, setActiveTab] = useState<'users' | 'orders' | 'transactions' | 'stats' | 'features' | 'apikey' | 'generations'>('users');
  
  // Users state
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [creditAmount, setCreditAmount] = useState(100);
  const [creditReason, setCreditReason] = useState('');
  const [isRemovingCredits, setIsRemovingCredits] = useState(false);
  // Plan change modal states
  const [planChangeUser, setPlanChangeUser] = useState<UserWithProfile | null>(null);
  const [newPlanType, setNewPlanType] = useState<string>('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGenerations: 0,
    totalCreditsIssued: 0,
    activeToday: 0,
  });

  // Feature flags state
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyMessage, setApiKeyMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [currentApiKeySource, setCurrentApiKeySource] = useState<string>('');

  // Generations state
  const [generations, setGenerations] = useState<GenerationLog[]>([]);
  const [selectedGenerationUser, setSelectedGenerationUser] = useState<string>('all');

  // Orders state
  const [orders, setOrders] = useState<LoraOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'processing' | 'ready' | 'delivered'>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderPhotos, setOrderPhotos] = useState<Record<string, { name: string; url: string }[]>>({});
  const [photosLoading, setPhotosLoading] = useState<string | null>(null);
  const [uploadingLora, setUploadingLora] = useState<string | null>(null);
  const loraFileInputRef = React.useRef<HTMLInputElement>(null);
  const [loraUploadTarget, setLoraUploadTarget] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user?.is_admin) {
      fetchUsers();
      fetchStats();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
    if (activeTab === 'features') {
      fetchFeatureFlags();
    }
    if (activeTab === 'apikey') {
      fetchCurrentApiKey();
    }
    if (activeTab === 'generations') {
      fetchGenerations();
    }
  }, [activeTab]);

  // Fetch generations when selected user changes
  useEffect(() => {
    if (activeTab === 'generations') {
      // Limpiar generaciones anteriores inmediatamente para evitar flash de contenido viejo
      setGenerations([]);
      fetchGenerations();
    }
  }, [selectedGenerationUser]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('credit_transactions')
      .select(`
        *,
        user_profiles:user_id (email)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setTransactions(data.map(t => ({
        ...t,
        user_email: t.user_profiles?.email
      })));
    }
    setLoading(false);
  };

  const fetchGenerations = async () => {
    setLoading(true);
    
    try {
      // Primero obtener las generaciones
      let query = supabase
        .from('generation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (selectedGenerationUser !== 'all') {
        query = query.eq('user_id', selectedGenerationUser);
      }

      const { data: genData, error: genError } = await query;

      if (genError) {
        console.error('Error fetching generations:', genError);
        setLoading(false);
        return;
      }

      // Si tenemos generaciones, obtener los emails de los usuarios
      if (genData && genData.length > 0) {
        // Obtener user_ids únicos
        const userIds = [...new Set(genData.map(g => g.user_id))];
        
        // Obtener los perfiles de usuario
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('id, email')
          .in('id', userIds);

        // Crear un mapa de user_id a email
        const emailMap: Record<string, string> = {};
        if (profilesData) {
          profilesData.forEach(profile => {
            emailMap[profile.id] = profile.email;
          });
        }

        // Combinar los datos
        const generationsWithEmail = genData.map(g => ({
          ...g,
          user_email: emailMap[g.user_id] || 'Unknown'
        }));

        setGenerations(generationsWithEmail);
      } else {
        setGenerations([]);
      }
    } catch (err) {
      console.error('Exception fetching generations:', err);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    const { data: genData } = await supabase
      .from('user_profiles')
      .select('total_generations');
    
    const totalGenerations = genData?.reduce((sum, u) => sum + (u.total_generations || 0), 0) || 0;

    const { data: creditData } = await supabase
      .from('credit_transactions')
      .select('amount')
      .gt('amount', 0);
    
    const totalCreditsIssued = creditData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: activeToday } = await supabase
      .from('generation_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    setStats({
      totalUsers: totalUsers || 0,
      totalGenerations,
      totalCreditsIssued,
      activeToday: activeToday || 0,
    });
  };

  // ── Orders functions ──────────────────────────────────────────────────────────

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_purchases')
        .select('*')
        .in('service_category', ['lora', 'package'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        setOrdersLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((o: any) => o.user_id))];
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        const profileMap: Record<string, { email: string; name: string }> = {};
        if (profiles) {
          profiles.forEach((p: any) => {
            profileMap[p.id] = { email: p.email, name: p.full_name || '' };
          });
        }

        setOrders(data.map((o: any) => ({
          ...o,
          user_email: profileMap[o.user_id]?.email || 'Unknown',
          user_name: profileMap[o.user_id]?.name || '',
        })));
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Error:', err);
    }
    setOrdersLoading(false);
  };

  const fetchOrderPhotos = async (userId: string, purchaseId: string) => {
    setPhotosLoading(purchaseId);
    try {
      const { data, error } = await supabase.storage
        .from('lora-uploads')
        .list(`${userId}/${purchaseId}`, { limit: 100 });

      if (error) {
        console.error('Error listing photos:', error);
        setPhotosLoading(null);
        return;
      }

      if (data && data.length > 0) {
        const photos = data
          .filter((f: any) => !f.name.startsWith('.'))
          .map((f: any) => {
            const path = `${userId}/${purchaseId}/${f.name}`;
            const { data: urlData } = supabase.storage
              .from('lora-uploads')
              .getPublicUrl(path);
            return { name: f.name, url: urlData.publicUrl };
          });
        setOrderPhotos(prev => ({ ...prev, [purchaseId]: photos }));
      } else {
        setOrderPhotos(prev => ({ ...prev, [purchaseId]: [] }));
      }
    } catch (err) {
      console.error('Error:', err);
    }
    setPhotosLoading(null);
  };

  const handleDownloadPhoto = async (userId: string, purchaseId: string, fileName: string) => {
    const path = `${userId}/${purchaseId}/${fileName}`;
    const { data, error } = await supabase.storage
      .from('lora-uploads')
      .download(path);

    if (error) {
      alert('Failed to download: ' + error.message);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllPhotos = async (userId: string, purchaseId: string) => {
    const photos = orderPhotos[purchaseId];
    if (!photos || photos.length === 0) return;

    for (const photo of photos) {
      await handleDownloadPhoto(userId, purchaseId, photo.name);
    }
  };

  const handleUploadLora = async (purchaseId: string, file: File) => {
    setUploadingLora(purchaseId);
    try {
      const ext = file.name.split('.').pop() || 'safetensors';
      const path = `${purchaseId}/lora.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('lora-deliveries')
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        alert('Upload failed: ' + uploadError.message);
        setUploadingLora(null);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('lora-deliveries')
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('service_purchases')
        .update({
          download_url: urlData.publicUrl,
          status: 'ready',
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseId);

      if (updateError) {
        alert('LoRA uploaded but failed to update order: ' + updateError.message);
      } else {
        fetchOrders();
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setUploadingLora(null);
    setLoraUploadTarget(null);
  };

  const handleOrderStatusChange = async (purchaseId: string, newStatus: string) => {
    const { error } = await supabase
      .from('service_purchases')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', purchaseId);

    if (error) {
      alert('Failed to update status: ' + error.message);
    } else {
      fetchOrders();
    }
  };

  const filteredOrders = orders.filter(o =>
    orderStatusFilter === 'all' ? true : o.status === orderStatusFilter
  );

  const fetchFeatureFlags = async () => {
    const { data } = await supabase.from('feature_flags').select('*').order('category');
    if (data) setFeatureFlags(data);
  };

  const fetchCurrentApiKey = async () => {
    try {
      setApiKeyLoading(true);
      // Use RPC instead of Edge Function
      const { data, error } = await supabase.rpc('get_api_key');
      
      if (error) {
        console.error('Error fetching API key:', error);
        setApiKeyMessage({ type: 'error', text: 'Failed to fetch current API key' });
      } else if (data) {
        // Mask the API key for display
        const maskedKey = data.substring(0, 10) + '...' + data.substring(data.length - 4);
        setApiKey(maskedKey);
        setCurrentApiKeySource('database');
      } else {
        setApiKey('');
        setCurrentApiKeySource('');
      }
    } catch (err) {
      console.error('Error:', err);
      setApiKeyMessage({ type: 'error', text: 'Error connecting to API' });
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleUpdateApiKey = async () => {
    if (!apiKey || apiKey.includes('...')) {
      setApiKeyMessage({ type: 'error', text: 'Please enter a valid API key' });
      return;
    }

    try {
      setApiKeyLoading(true);
      setApiKeyMessage(null);

      // Use RPC instead of Edge Function
      const { data, error } = await supabase.rpc('update_api_key', {
        p_api_key: apiKey
      });

      if (error) {
        console.error('Error updating API key:', error);
        setApiKeyMessage({ type: 'error', text: 'Failed to update API key: ' + error.message });
      } else if (data) {
        setApiKeyMessage({ type: 'success', text: 'API key updated successfully!' });
        // Clear the input after successful update
        setApiKey('');
        // Refresh the API key in the main app
        if ((window as any).refreshAppApiKey) {
          (window as any).refreshAppApiKey();
        }
        setTimeout(() => {
          fetchCurrentApiKey();
        }, 1000);
      } else {
        setApiKeyMessage({ type: 'error', text: 'Unknown error' });
      }
    } catch (err: any) {
      console.error('Error:', err);
      setApiKeyMessage({ type: 'error', text: 'Error: ' + err.message });
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleAddCredits = async (isRemoving: boolean = false) => {
    if (!selectedUser || creditAmount <= 0) return;

    const actualAmount = isRemoving ? -creditAmount : creditAmount;
    const defaultDescription = isRemoving ? 'Admin credit removal' : 'Admin credit adjustment';

    const { error } = await supabase.rpc('add_credits', {
      p_user_id: selectedUser.id,
      p_amount: actualAmount,
      p_description: creditReason || defaultDescription,
      p_type: 'admin_adjustment',
    });

    if (!error) {
      fetchUsers();
      setSelectedUser(null);
      setCreditAmount(100);
      setCreditReason('');
      setIsRemovingCredits(false);
      alert(`${isRemoving ? 'Removed' : 'Added'} ${creditAmount} credits ${isRemoving ? 'from' : 'to'} ${selectedUser.email}`);
    } else {
      alert('Error adjusting credits: ' + error.message);
    }
  };

  // Credits per plan
  const PLAN_CREDITS: Record<string, number> = {
    free: 3,
    starter: 50,
    creator: 120,
    pro: 250,
    studio: 600,
  };

  const handlePlanChangeRequest = (user: UserWithProfile, newPlan: string) => {
    if (newPlan === user.plan_type) return;
    setPlanChangeUser(user);
    setNewPlanType(newPlan);
  };

  const handleChangePlan = async (resetCredits: boolean) => {
    if (!planChangeUser || !newPlanType) return;

    // Update plan
    const { error: planError } = await supabase.rpc('update_user_plan', {
      p_user_id: planChangeUser.id,
      p_plan_type: newPlanType,
    });

    if (planError) {
      alert('Error updating plan: ' + planError.message);
      return;
    }

    // Reset credits if requested
    if (resetCredits) {
      const newCredits = PLAN_CREDITS[newPlanType] || 3;
      const { error: creditError } = await supabase
        .from('user_profiles')
        .update({ credits: newCredits })
        .eq('id', planChangeUser.id);

      if (creditError) {
        alert('Plan updated but failed to reset credits: ' + creditError.message);
      } else {
        // Log the transaction
        await supabase.from('credit_transactions').insert({
          user_id: planChangeUser.id,
          amount: newCredits - planChangeUser.credits,
          type: 'admin_adjustment',
          description: `Plan changed to ${newPlanType} - credits reset to ${newCredits}`,
        });
      }
    }

    fetchUsers();
    setPlanChangeUser(null);
    setNewPlanType('');
    alert(`Plan updated to ${newPlanType}${resetCredits ? ` with ${PLAN_CREDITS[newPlanType]} credits` : ''}`);
  };

  const toggleFeature = async (key: string, currentValue: boolean) => {
    const success = await updateFlag(key, !currentValue);
    if (success) {
      fetchFeatureFlags();
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedFeatures = featureFlags.reduce((acc, flag) => {
    if (!acc[flag.category]) acc[flag.category] = [];
    acc[flag.category].push(flag);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

  if (!isOpen) return null;

  if (!user?.is_admin) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80">
        <div className="bg-[var(--bg-primary)] p-8 rounded-2xl shadow-2xl text-center border border-[var(--border-color)]">
          <Shield className="w-16 h-16 text-[#a11008] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h2>
          <p className="text-[var(--text-secondary)]">You don't have permission to access the admin panel.</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--hover-bg)] border border-[var(--border-color)]"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-7xl mx-auto bg-[var(--bg-primary)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
          {/* Header */}
          <div className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] p-6 border-b border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-reed-red" />
                <div>
                  <h2 className="text-2xl font-bold">Admin Panel</h2>
                  <p className="text-[var(--text-muted)] text-sm">Manage users, credits, and system</p>
                </div>
              </div>
              <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalUsers}</div>
                <div className="text-[var(--text-muted)] text-sm">Total Users</div>
              </div>
              <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalGenerations}</div>
                <div className="text-[var(--text-muted)] text-sm">Total Generations</div>
              </div>
              <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
                <div className="text-2xl font-bold text-reed-red">{stats.totalCreditsIssued}</div>
                <div className="text-[var(--text-muted)] text-sm">Credits Issued</div>
              </div>
              <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
                <div className="text-2xl font-bold text-green-400">{stats.activeToday}</div>
                <div className="text-[var(--text-muted)] text-sm">Active Today</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-[var(--border-color)]">
            <div className="flex">
              {(['users', 'orders', 'transactions', 'generations', 'stats', 'features', 'apikey'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-reed-red border-b-2 border-reed-red'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab === 'orders' && <Package className="w-4 h-4 inline mr-1" />}
                  {tab === 'features' && <Settings className="w-4 h-4 inline mr-1" />}
                  {tab === 'apikey' && <Key className="w-4 h-4 inline mr-1" />}
                  {tab === 'apikey' ? 'API Key' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'users' && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red bg-[var(--bg-primary)] text-[var(--text-primary)]"
                    />
                  </div>
                  <button
                    onClick={fetchUsers}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-reed-red" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[var(--bg-secondary)]">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)]">User</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)]">Plan</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)]">Credits</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)]">Generations</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-[var(--hover-bg)]">
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-[var(--text-primary)]">{u.full_name || 'N/A'}</div>
                                <div className="text-sm text-[var(--text-muted)]">{u.email}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={u.plan_type}
                                onChange={(e) => handlePlanChangeRequest(u, e.target.value)}
                                className="border border-[var(--border-color)] rounded px-2 py-1 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)]"
                              >
                                <option value="free">Free</option>
                                <option value="starter">Starter</option>
                                <option value="creator">Creator</option>
                                <option value="pro">Pro</option>
                                <option value="studio">Studio</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-bold ${u.credits < 10 ? 'text-[#a11008]' : 'text-green-500'}`}>
                                {u.credits}
                              </span>
                            </td>
                            <td className="px-4 py-3">{u.total_generations}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setIsRemovingCredits(false);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 bg-reed-red text-white text-sm rounded hover:bg-reed-red-dark"
                                  title="Add credits"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setIsRemovingCredits(true);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                                  title="Remove credits"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedGenerationUser(u.id);
                                    setActiveTab('generations');
                                    fetchGenerations();
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded hover:bg-[var(--hover-bg)]"
                                  title="View generations"
                                >
                                  <ImageIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex gap-2">
                    {(['all', 'processing', 'ready', 'delivered'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setOrderStatusFilter(status)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                          orderStatusFilter === status
                            ? 'bg-reed-red text-white'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <span className="text-sm text-[var(--text-muted)]">
                    {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={fetchOrders}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-reed-red" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text-muted)]">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No orders found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => {
                      const isExpanded = expandedOrder === order.id;
                      const photos = orderPhotos[order.id];

                      return (
                        <div key={order.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                          {/* Order header */}
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <h4 className="font-semibold text-[var(--text-primary)] truncate">{order.service_name}</h4>
                                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                    order.status === 'processing' ? 'bg-amber-500/10 text-amber-500' :
                                    order.status === 'ready' ? 'bg-green-500/10 text-green-500' :
                                    'bg-blue-500/10 text-blue-500'
                                  }`}>
                                    {order.status}
                                  </span>
                                  {order.photos_uploaded && (
                                    <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-green-500/10 text-green-500 uppercase">Photos uploaded</span>
                                  )}
                                </div>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  {order.user_name && <span className="font-medium">{order.user_name} — </span>}
                                  {order.user_email}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                  <p className="text-xs text-[var(--text-muted)]">
                                    {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} — ${order.amount}
                                  </p>
                                  {order.metadata?.model_name && (
                                    <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-reed-red/10 text-reed-red uppercase">
                                      Model: {order.metadata.model_name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Status dropdown */}
                                <select
                                  value={order.status}
                                  onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                                  className="border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)]"
                                >
                                  <option value="processing">Processing</option>
                                  <option value="ready">Ready</option>
                                  <option value="delivered">Delivered</option>
                                </select>

                                {/* Expand/collapse */}
                                <button
                                  onClick={() => {
                                    if (isExpanded) {
                                      setExpandedOrder(null);
                                    } else {
                                      setExpandedOrder(order.id);
                                      if (order.photos_uploaded && !orderPhotos[order.id]) {
                                        fetchOrderPhotos(order.user_id, order.id);
                                      }
                                    }
                                  }}
                                  className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]"
                                >
                                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="border-t border-[var(--border-color)] p-5 space-y-6">
                              {/* Reference Photos */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-sm font-semibold text-[var(--text-primary)]">Reference Photos</h5>
                                  {photos && photos.length > 0 && (
                                    <button
                                      onClick={() => handleDownloadAllPhotos(order.user_id, order.id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      Download All
                                    </button>
                                  )}
                                </div>

                                {photosLoading === order.id ? (
                                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading photos...
                                  </div>
                                ) : !order.photos_uploaded ? (
                                  <p className="text-sm text-[var(--text-muted)]">User has not uploaded photos yet.</p>
                                ) : photos && photos.length > 0 ? (
                                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                    {photos.map((photo, i) => (
                                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--border-color)]">
                                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <button
                                            onClick={() => handleDownloadPhoto(order.user_id, order.id, photo.name)}
                                            className="p-1.5 bg-white rounded-full hover:bg-gray-200"
                                          >
                                            <Download className="w-3.5 h-3.5 text-gray-900" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-[var(--text-muted)]">No photos found in storage.</p>
                                )}
                              </div>

                              {/* Upload LoRA */}
                              <div>
                                <h5 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Upload Finished LoRA</h5>

                                {order.download_url ? (
                                  <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-green-500">LoRA file uploaded</p>
                                      <p className="text-xs text-[var(--text-muted)] truncate">{order.download_url}</p>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setLoraUploadTarget(order.id);
                                        loraFileInputRef.current?.click();
                                      }}
                                      className="px-3 py-1.5 text-xs font-medium border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]"
                                    >
                                      Replace
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setLoraUploadTarget(order.id);
                                      loraFileInputRef.current?.click();
                                    }}
                                    disabled={uploadingLora === order.id}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-reed-red text-white text-sm font-medium rounded-lg hover:bg-reed-red-dark transition-colors disabled:opacity-50"
                                  >
                                    {uploadingLora === order.id ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-4 h-4" />
                                        Upload LoRA File
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Hidden file input for LoRA upload */}
                <input
                  ref={loraFileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && loraUploadTarget) {
                      handleUploadLora(loraUploadTarget, file);
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            )}

            {activeTab === 'transactions' && (
              <div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-reed-red" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[var(--bg-secondary)]">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)]">Date</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)]">User</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)]">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)]">Amount</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)]">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-[var(--bg-secondary)]">
                            <td className="px-4 py-3 text-sm">
                              {new Date(t.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm">{t.user_email}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                t.type === 'purchase' ? 'bg-green-100 text-green-500' :
                                t.type === 'usage' ? 'bg-red-100 text-[#a11008]' :
                                t.type === 'bonus' ? 'bg-blue-100 text-blue-400' :
                                'bg-[var(--bg-secondary)] text-gray-800'
                              }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className={`px-4 py-3 font-bold ${t.amount > 0 ? 'text-green-500' : 'text-[#a11008]'}`}>
                              {t.amount > 0 ? '+' : ''}{t.amount}
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{t.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'generations' && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <select
                      value={selectedGenerationUser}
                      onChange={(e) => {
                        setSelectedGenerationUser(e.target.value);
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red bg-[var(--bg-primary)] text-[var(--text-primary)]"
                    >
                      <option value="all">All Users</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.email} ({u.total_generations} gens)
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedGenerationUser !== 'all' && (
                    <button
                      onClick={() => setSelectedGenerationUser('all')}
                      className="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]"
                    >
                      Show All
                    </button>
                  )}
                  <button
                    onClick={fetchGenerations}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg)]"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-reed-red" />
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 text-sm text-[var(--text-muted)]">
                      Showing {generations.length} generation{generations.length !== 1 ? 's' : ''}
                      {selectedGenerationUser !== 'all' && (
                        <span> for {users.find(u => u.id === selectedGenerationUser)?.full_name || 'selected user'}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {generations.map((g) => (
                        <div key={g.id} className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden hover:border-reed-red transition-colors group">
                          <div className="aspect-square relative">
                            <img 
                              src={g.image_url} 
                              alt={g.model_name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <a
                                href={g.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-white rounded-full hover:bg-gray-200"
                                title="View full size"
                              >
                                <Eye className="w-4 h-4 text-gray-900" />
                              </a>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = g.image_url;
                                  link.download = `generation_${g.model_name}_${new Date(g.created_at).getTime()}.png`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="p-2 bg-white rounded-full hover:bg-gray-200"
                                title="Download"
                              >
                                <Download className="w-4 h-4 text-gray-900" />
                              </button>
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="font-medium text-[var(--text-primary)] text-sm truncate">{g.model_name}</div>
                            <div className="text-xs text-[var(--text-muted)] truncate">{g.user_email}</div>
                            <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-muted)]">
                              <span>{new Date(g.created_at).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                {g.credits_used}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {generations.length === 0 && (
                      <div className="text-center py-12 text-[var(--text-muted)]">
                        <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No generations found</p>
                        {selectedGenerationUser !== 'all' && (
                          <p className="text-sm mt-2">This user hasn't generated any images yet</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="text-center py-12 text-gray-500">
                Detailed statistics coming soon...
              </div>
            )}

            {activeTab === 'features' && (
              <div>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5" /> Feature Flags
                </h3>
                
                {flagsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-reed-red" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(groupedFeatures).map(([category, categoryFlags]: [string, FeatureFlag[]]) => (
                      <div key={category}>
                        <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-4 capitalize">
                          {category}
                        </h4>
                        <div className="grid gap-4">
                          {categoryFlags.map((flag: FeatureFlag) => (
                            <div 
                              key={flag.id}
                              className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg"
                            >
                              <div>
                                <div className="font-medium text-[var(--text-primary)]">{flag.key}</div>
                                <div className="text-sm text-gray-500">{flag.description}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Current: {JSON.stringify(flag.value)}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => toggleFeature(flag.key, flag.value === true || flag.value === 'true')}
                                className={`p-2 rounded-lg transition-colors ${
                                  flag.value === true || flag.value === 'true'
                                    ? 'bg-green-100 text-green-500'
                                    : 'bg-[var(--bg-secondary)] text-gray-400'
                                }`}
                              >
                                {flag.value === true || flag.value === 'true' ? (
                                  <ToggleRight className="w-6 h-6" />
                                ) : (
                                  <ToggleLeft className="w-6 h-6" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-400 mb-2">Quick Actions</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFeature('maintenance_mode', isEnabled('maintenance_mode'))}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {isEnabled('maintenance_mode') ? 'Disable' : 'Enable'} Maintenance
                    </button>
                    <button
                      onClick={() => toggleFeature('registration_open', isEnabled('registration_open'))}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      {isEnabled('registration_open') ? 'Close' : 'Open'} Registration
                    </button>
                    <button
                      onClick={() => toggleFeature('nsfw_generation', isEnabled('nsfw_generation'))}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      {isEnabled('nsfw_generation') ? 'Disable' : 'Enable'} NSFW
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'apikey' && (
              <div>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Key className="w-5 h-5" /> API Key Management
                </h3>

                <div className="max-w-2xl">
                  <div className="bg-[var(--bg-secondary)] p-6 rounded-lg mb-6">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-2">Current API Key Status</h4>
                    <div className="flex items-center gap-2 mb-4">
                      {apiKeyLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      ) : apiKey ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-green-500 font-medium">API Key Configured</span>
                          <span className="text-gray-400 text-sm">({currentApiKeySource})</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <span className="text-amber-600 font-medium">No API Key Found</span>
                        </>
                      )}
                    </div>
                    
                    {apiKey && !apiKey.includes('...') && (
                      <div className="text-sm text-[var(--text-secondary)] mb-4">
                        Current Key: <code className="bg-[var(--bg-secondary)] px-2 py-1 rounded">{apiKey}</code>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        New Gemini API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey.includes('...') ? '' : apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Enter your Gemini API key (starts with AIza...)"
                          className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red pr-12"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[var(--text-secondary)]"
                        >
                          {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Get your API key from{' '}
                        <a 
                          href="https://aistudio.google.com/app/apikey" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-reed-red hover:underline"
                        >
                          Google AI Studio
                        </a>
                      </p>
                    </div>

                    {apiKeyMessage && (
                      <div className={`p-4 rounded-lg flex items-center gap-2 ${
                        apiKeyMessage.type === 'success' 
                          ? 'bg-green-50 text-green-500 border border-green-200' 
                          : 'bg-red-50 text-[#a11008] border border-red-200'
                      }`}>
                        {apiKeyMessage.type === 'success' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                        {apiKeyMessage.text}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleUpdateApiKey}
                        disabled={apiKeyLoading || !apiKey || apiKey.includes('...')}
                        className="flex-1 py-3 bg-reed-red text-white rounded-lg hover:bg-reed-red-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {apiKeyLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Updating...
                          </span>
                        ) : (
                          'Update API Key'
                        )}
                      </button>
                      <button
                        onClick={fetchCurrentApiKey}
                        disabled={apiKeyLoading}
                        className="px-4 py-3 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] disabled:opacity-50"
                      >
                        <RefreshCw className={`w-5 h-5 ${apiKeyLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Important Notes
                    </h4>
                    <ul className="text-sm text-blue-400 space-y-2 list-disc list-inside">
                      <li>Updating the API key will affect all users immediately</li>
                      <li>Make sure the new key has sufficient quota for image generation</li>
                      <li>The old key will be replaced and cannot be recovered</li>
                      <li>Users will need to refresh the page to use the new key</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credits Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">
              {isRemovingCredits ? 'Remove Credits' : 'Add Credits'}
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              User: <span className="font-semibold text-[var(--text-primary)]">{selectedUser.email}</span><br />
              Current: <span className="font-semibold text-[var(--text-primary)]">{selectedUser.credits} credits</span>
              {isRemovingCredits && (
                <>
                  <br />
                  <span className="text-amber-500">After removal: {Math.max(0, selectedUser.credits - creditAmount)} credits</span>
                </>
              )}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Amount</label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  min="1"
                  max={isRemovingCredits ? selectedUser.credits : undefined}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  placeholder={isRemovingCredits ? "e.g., Refund reversal, Correction" : "e.g., Bonus, Refund, Promotion"}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setIsRemovingCredits(false);
                }}
                className="flex-1 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddCredits(isRemovingCredits)}
                className={`flex-1 py-2 text-white rounded-lg ${
                  isRemovingCredits
                    ? 'bg-gray-600 hover:bg-gray-700'
                    : 'bg-reed-red hover:bg-reed-red-dark'
                }`}
              >
                {isRemovingCredits ? 'Remove Credits' : 'Add Credits'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Change Confirmation Modal */}
      {planChangeUser && newPlanType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-[var(--bg-primary)] p-6 rounded-2xl shadow-2xl w-full max-w-md border border-[var(--border-color)]">
            <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Change Plan</h3>
            <p className="text-[var(--text-secondary)] mb-2">
              User: <span className="font-semibold">{planChangeUser.email}</span>
            </p>
            <p className="text-[var(--text-secondary)] mb-4">
              <span className="text-gray-500">{planChangeUser.plan_type}</span>
              <span className="mx-2">→</span>
              <span className="font-semibold text-reed-red">{newPlanType}</span>
            </p>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-500">
                <strong>Current credits:</strong> {planChangeUser.credits}<br />
                <strong>New plan credits:</strong> {PLAN_CREDITS[newPlanType] || 0}
              </p>
            </div>

            <p className="text-sm text-[var(--text-muted)] mb-4">
              Do you want to reset the credits to match the new plan?
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleChangePlan(true)}
                className="w-full py-3 bg-reed-red text-white rounded-lg hover:bg-reed-red-dark font-medium"
              >
                Change Plan + Reset to {PLAN_CREDITS[newPlanType]} credits
              </button>
              <button
                onClick={() => handleChangePlan(false)}
                className="w-full py-3 border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] font-medium"
              >
                Only Change Plan (keep {planChangeUser.credits} credits)
              </button>
              <button
                onClick={() => {
                  setPlanChangeUser(null);
                  setNewPlanType('');
                }}
                className="w-full py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
