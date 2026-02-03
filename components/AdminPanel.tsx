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
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'stats'>('users');
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

  useEffect(() => {
    if (isOpen && user?.is_admin) {
      fetchUsers();
      fetchStats();
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

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  if (!user?.is_admin) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80">
        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center">
          <Shield className="w-16 h-16 text-[#a11008] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h2>
          <p className="text-[var(--text-secondary)]">You don't have permission to access the admin panel.</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-[var(--bg-secondary)] text-gray-800 rounded-lg hover:bg-gray-300"
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
          <div className="border-b border-[var(--border-color)]">
            <div className="flex">
              {(['users', 'transactions', 'stats'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-reed-red border-b-2 border-reed-red'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab}
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
                      className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-reed-red"
                    />
                  </div>
                  <button
                    onClick={fetchUsers}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)]"
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
                          <tr key={u.id} className="hover:bg-[var(--bg-secondary)]">
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-[var(--text-primary)]">{u.full_name || 'N/A'}</div>
                                <div className="text-sm text-gray-500">{u.email}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={u.plan_type}
                                onChange={(e) => handlePlanChangeRequest(u, e.target.value)}
                                className="border border-[var(--border-color)] rounded px-2 py-1 text-sm"
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
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setIsRemovingCredits(true);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                                >
                                  <Minus className="w-4 h-4" />
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
                                t.type === 'bonus' ? 'bg-blue-100 text-blue-800' :
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

            {activeTab === 'stats' && (
              <div className="text-center py-12 text-gray-500">
                Detailed statistics coming soon...
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
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Change Plan</h3>
            <p className="text-[var(--text-secondary)] mb-2">
              User: <span className="font-semibold text-[var(--text-primary)]">{planChangeUser.email}</span>
            </p>
            <p className="text-[var(--text-secondary)] mb-4">
              <span className="text-[var(--text-muted)]">{planChangeUser.plan_type}</span>
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
