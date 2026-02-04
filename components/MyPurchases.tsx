import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Download, Upload, Eye, AlertTriangle, Loader2, Layers, Cpu, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { getServiceById } from '../services/servicesData';

interface ServicePurchase {
  id: string;
  order_number: string | null;
  service_id: string;
  service_name: string;
  service_category: 'workflow' | 'lora' | 'package';
  amount: number;
  status: 'processing' | 'ready' | 'delivered';
  photos_uploaded: boolean;
  download_url: string | null;
  created_at: string;
}

interface MyPurchasesProps {
  onBack: () => void;
  onViewContent: (purchaseId: string, serviceId: string) => void;
  onUploadPhotos: (purchaseId: string, serviceId: string) => void;
}

export const MyPurchases: React.FC<MyPurchasesProps> = ({
  onBack,
  onViewContent,
  onUploadPhotos
}) => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<ServicePurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPurchases();
    }
  }, [user]);

  const loadPurchases = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('service_purchases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading purchases:', error);
    } else {
      setPurchases(data || []);
    }
    setLoading(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'workflow': return <Layers className="w-5 h-5" />;
      case 'lora': return <Cpu className="w-5 h-5" />;
      case 'package': return <Sparkles className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'workflow': return 'SDXL Workflow';
      case 'lora': return 'Custom LoRA';
      case 'package': return 'Package';
      default: return 'Service';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-semibold rounded-full">Processing</span>;
      case 'ready':
        return <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-semibold rounded-full">Ready</span>;
      case 'delivered':
        return <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-xs font-semibold rounded-full">Delivered</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-reed-red/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-reed-red" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Purchases</h1>
              <p className="text-sm text-[var(--text-muted)]">View and manage your service orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Warning */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-500">Personal Use Only</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              All purchased files (workflows, LoRAs, images) are for your personal use only. Redistribution, resale, or sharing is strictly prohibited and may result in account termination.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-reed-red animate-spin" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No purchases yet</h3>
            <p className="text-[var(--text-muted)] mb-6">Browse our services to get started with custom LoRAs, workflows, and packages.</p>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-6 py-3 bg-reed-red text-white font-semibold rounded-xl hover:bg-reed-red-dark transition-colors"
            >
              Browse Services
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => {
              const serviceData = getServiceById(purchase.service_id);
              const needsUpload = (purchase.service_category === 'lora' || purchase.service_category === 'package') && !purchase.photos_uploaded;

              return (
                <div
                  key={purchase.id}
                  className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 hover:border-[var(--text-muted)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-reed-red/10 flex items-center justify-center text-reed-red flex-shrink-0">
                        {getCategoryIcon(purchase.service_category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-[var(--text-primary)] truncate">{purchase.service_name}</h3>
                          {purchase.service_category !== 'workflow' && getStatusBadge(purchase.status)}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs text-reed-red font-medium uppercase tracking-wider">
                            {getCategoryLabel(purchase.service_category)}
                          </p>
                          {purchase.order_number && (
                            <>
                              <span className="text-xs text-[var(--text-muted)]">&middot;</span>
                              <p className="text-xs text-[var(--text-muted)] font-mono">{purchase.order_number}</p>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-[var(--text-muted)]">
                          Purchased {formatDate(purchase.created_at)} &middot; ${purchase.amount}
                        </p>
                        {serviceData && (
                          <p className="text-sm text-[var(--text-secondary)] mt-2">{serviceData.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {needsUpload && (
                        <button
                          onClick={() => onUploadPhotos(purchase.id, purchase.service_id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-reed-red text-white text-sm font-medium rounded-lg hover:bg-reed-red-dark transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Photos
                        </button>
                      )}
                      <button
                        onClick={() => onViewContent(purchase.id, purchase.service_id)}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] text-sm font-medium rounded-lg hover:border-reed-red hover:text-reed-red transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Content
                      </button>
                      {purchase.download_url && (
                        <a
                          href={purchase.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 border border-green-500/30 text-green-500 text-sm font-medium rounded-lg hover:bg-green-500/10 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPurchases;
