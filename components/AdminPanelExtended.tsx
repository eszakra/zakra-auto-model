import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { 
  Users, CreditCard, TrendingUp, Search, Plus, Minus, 
  Crown, Shield, X, Loader2, RefreshCw, ToggleLeft, ToggleRight,
  Settings, Zap, Lock
} from 'lucide-react';

// ... [keep existing interfaces] ...

interface FeatureFlag {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { flags, isEnabled, updateFlag, loading: flagsLoading } = useFeatureFlags();
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'stats' | 'features'>('users');
  // ... [keep existing state] ...
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);

  // Fetch feature flags
  const fetchFeatureFlags = async () => {
    const { data } = await supabase.from('feature_flags').select('*').order('category');
    if (data) setFeatureFlags(data);
  };

  useEffect(() => {
    if (activeTab === 'features') {
      fetchFeatureFlags();
    }
  }, [activeTab]);

  // Toggle feature flag
  const toggleFeature = async (key: string, currentValue: boolean) => {
    const success = await updateFlag(key, !currentValue);
    if (success) {
      fetchFeatureFlags();
    }
  };

  // Group features by category
  const groupedFeatures = featureFlags.reduce((acc, flag) => {
    if (!acc[flag.category]) acc[flag.category] = [];
    acc[flag.category].push(flag);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

  // ... [keep existing fetch functions and handlers] ...

  if (!isOpen) return null;

  if (!user?.is_admin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-reed-red" />
                <div>
                  <h2 className="text-2xl font-bold">Admin Panel</h2>
                  <p className="text-gray-400 text-sm">Manage users, credits, and system</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                <div className="text-gray-400 text-sm">Total Users</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-white">{stats.totalGenerations}</div>
                <div className="text-gray-400 text-sm">Total Generations</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-reed-red">{stats.totalCreditsIssued}</div>
                <div className="text-gray-400 text-sm">Credits Issued</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{stats.activeToday}</div>
                <div className="text-gray-400 text-sm">Active Today</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              {(['users', 'transactions', 'stats', 'features'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-reed-red border-b-2 border-reed-red'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab === 'features' <> <Settings className="w-4 h-4 inline mr-1" /> : null}
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
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
                    {Object.entries(groupedFeatures).map(([category, flags]) => (
                      <div key={category}>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                          {category}
                        </h4>
                        <div className="grid gap-4">
                          {flags.map((flag) => (
                            <div 
                              key={flag.id}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <div className="font-medium text-gray-900">{flag.key}</div>
                                <div className="text-sm text-gray-500">{flag.description}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Current: {JSON.stringify(flag.value)}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => toggleFeature(flag.key, flag.value === true || flag.value === 'true')}
                                className={`p-2 rounded-lg transition-colors ${
                                  flag.value === true || flag.value === 'true'
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-gray-200 text-gray-400'
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
                  <h4 className="font-semibold text-blue-900 mb-2">Quick Actions</h4>
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

            {/* ... [keep existing tabs content] ... */}
          </div>
        </div>
      </div>

      {/* ... [keep existing modals] ... */}
    </div>
  );
};

export default AdminPanel;
