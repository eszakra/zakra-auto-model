import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, CreditCard, TrendingUp, Search, Plus, Minus, 
  Crown, Shield, X, Loader2, RefreshCw 
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

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'stats' | 'settings'>('users');
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [creditAmount, setCreditAmount] = useState(100);
  const [creditReason, setCreditReason] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGenerations: 0,
    totalCreditsIssued: 0,
    activeToday: 0,
  });
  const [apiKey, setApiKey] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [loadingApiKey, setLoadingApiKey] = useState(false);

  useEffect(() => {
    if (isOpen && user?.is_admin) {
      fetchUsers();
      fetchStats();
      fetchApiKey();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);

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

  const fetchStats = async () => {
    // Total users
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    // Total generations
    const { data: genData } = await supabase
      .from('user_profiles')
      .select('total_generations');
    
    const totalGenerations = genData?.reduce((sum, u) => sum + (u.total_generations || 0), 0) || 0;

    // Total credits issued
    const { data: creditData } = await supabase
      .from('credit_transactions')
      .select('amount')
      .gt('amount', 0);
    
    const totalCreditsIssued = creditData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    // Active today
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

  const handleAddCredits = async () => {
    if (!selectedUser || creditAmount <= 0) return;

    const { error } = await supabase.rpc('add_credits', {
      p_user_id: selectedUser.id,
      p_amount: creditAmount,
      p_description: creditReason || 'Admin credit adjustment',
      p_type: 'admin_adjustment',
    });

    if (!error) {
      fetchUsers();
      setSelectedUser(null);
      setCreditAmount(100);
      setCreditReason('');
      alert(`Added ${creditAmount} credits to ${selectedUser.email}`);
    } else {
      alert('Error adding credits: ' + error.message);
    }
  };

  const handleChangePlan = async (userId: string, newPlan: string) => {
    const { error } = await supabase.rpc('update_user_plan', {
      p_user_id: userId,
      p_plan_type: newPlan,
    });

    if (!error) {
      fetchUsers();
      alert('Plan updated successfully');
    } else {
      alert('Error updating plan: ' + error.message);
    }
  };

  const fetchApiKey = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'gemini_api_key')
      .single();
    
    if (!error && data) {
      setApiKey(data.value);
    }
  };

  const handleUpdateApiKey = async () => {
    if (!newApiKey.trim()) return;

    setLoadingApiKey(true);
    const { error } = await supabase.rpc('update_api_key', {
      p_new_key: newApiKey.trim(),
    });

    if (!error) {
      setApiKey(newApiKey.trim());
      setNewApiKey('');
      // Refresh API key in main app
      if ((window as any).refreshApiKey) {
        (window as any).refreshApiKey();
      }
      alert('API Key updated successfully! All users will use the new key immediately.');
    } else {
      alert('Error updating API key: ' + error.message);
    }
    setLoadingApiKey(false);
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              {(['users', 'transactions', 'stats', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-reed-red border-b-2 border-reed-red'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab === 'settings' ? 'API Settings' : tab}
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-reed-red"
                    />
                  </div>
                  <button
                    onClick={fetchUsers}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
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
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Plan</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Credits</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Generations</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-gray-900">{u.full_name || 'N/A'}</div>
                                <div className="text-sm text-gray-500">{u.email}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={u.plan_type}
                                onChange={(e) => handleChangePlan(u.id, e.target.value)}
                                className="border border-gray-200 rounded px-2 py-1 text-sm"
                              >
                                <option value="free">Free</option>
                                <option value="basic">Basic</option>
                                <option value="pro">Pro</option>
                                <option value="premium">Premium</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-bold ${u.credits < 10 ? 'text-red-600' : 'text-green-600'}`}>
                                {u.credits}
                              </span>
                            </td>
                            <td className="px-4 py-3">{u.total_generations}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="flex items-center gap-1 px-3 py-1 bg-reed-red text-white text-sm rounded hover:bg-reed-red-dark"
                              >
                                <Plus className="w-4 h-4" /> Credits
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {new Date(t.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm">{t.user_email}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                t.type === 'purchase' ? 'bg-green-100 text-green-800' :
                                t.type === 'usage' ? 'bg-red-100 text-red-800' :
                                t.type === 'bonus' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className={`px-4 py-3 font-bold ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {t.amount > 0 ? '+' : ''}{t.amount}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{t.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="text-center py-12 text-gray-500">
                Detailed statistics coming soon...
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold mb-6">API Configuration</h3>
                
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Gemini API Key
                  </label>
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="password"
                      value={apiKey}
                      readOnly
                      className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 font-mono text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(apiKey);
                        alert('API Key copied to clipboard!');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                    >
                      Copy
                    </button>
                    <button
                      onClick={fetchApiKey}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                      title="Refresh from Supabase"
                    >
                      Refresh
                    </button>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Update API Key
                    </label>
                    <input
                      type="password"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="Enter new API key..."
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-reed-red font-mono text-sm mb-3"
                    />
                    <p className="text-xs text-gray-500 mb-4">
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
                    <button
                      onClick={handleUpdateApiKey}
                      disabled={!newApiKey.trim() || loadingApiKey}
                      className="w-full py-2 bg-reed-red text-white rounded-lg hover:bg-reed-red-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loadingApiKey ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update API Key'
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Important Notes:</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>This API key is used globally for all users</li>
                    <li>Changing the key will affect all image generations immediately</li>
                    <li>Make sure the new key has sufficient quota</li>
                    <li>The old key will be replaced and cannot be recovered</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Credits Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Credits</h3>
            <p className="text-gray-600 mb-4">
              User: <span className="font-semibold">{selectedUser.email}</span><br />
              Current: <span className="font-semibold">{selectedUser.credits} credits</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-reed-red"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-reed-red"
                  placeholder="e.g., Bonus, Refund, Promotion"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCredits}
                className="flex-1 py-2 bg-reed-red text-white rounded-lg hover:bg-reed-red-dark"
              >
                Add Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
