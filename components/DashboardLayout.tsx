import React, { useState, useCallback, lazy, Suspense } from 'react';
import {
  ShoppingCart, CreditCard,
  Wand2, Fingerprint, GitBranch, Box,
  MessageCircle, ArrowLeft, ChevronLeft, ChevronRight,
  Check, Crown, Zap, Package, LogOut, User, Flame,
  X, Menu, Shield, Loader2
} from 'lucide-react';
import App from '../App';
import { useAuth } from '../contexts/AuthContext';
import { MyPurchases } from './MyPurchases';
import { ServiceContent } from './ServiceContent';
import { LoraUploadFlow } from './LoraUploadFlow';
import { ServicePaymentModal } from './ServicePaymentModal';
import { ServiceThankYouModal } from './ServiceThankYouModal';
import { PaymentModal } from './PaymentModal';
import { WORKFLOWS, LORAS, PACKAGES, ServiceItem, getServiceById } from '../services/servicesData';

const AdminPanel = lazy(() => import('./AdminPanelExtended').then(m => ({ default: m.AdminPanel })));

type DashboardTab = 'generator' | 'loras' | 'workflows' | 'credits' | 'purchases' | 'admin';

interface DashboardLayoutProps {
  onBackToLanding: () => void;
}

// ─── Store View: LoRAs for purchase ───────────────────────────────────────────
const LorasStoreView = ({ onBuyService }: { onBuyService: (service: ServiceItem) => void }) => (
  <div className="p-6 lg:p-10 max-w-6xl mx-auto">
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-reed-red/10 flex items-center justify-center">
          <Fingerprint className="w-5 h-5 text-reed-red" />
        </div>
        <h1 className="font-display text-3xl font-bold text-white">Custom LoRAs</h1>
      </div>
      <p className="text-white/50 text-sm mt-2 max-w-xl">
        100% manually trained by our expert team. Choose your base model (SDXL, Flux, Z Image Turbo) and receive your custom LoRA in 1-5 days.
      </p>
    </div>

    {/* Launch Sale Badge */}
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-reed-red/10 border border-reed-red/30 rounded-full text-sm font-semibold text-reed-red mb-8">
      <span className="w-2 h-2 bg-reed-red rounded-full animate-pulse" />
      Launch Sale — Limited Time Pricing
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      {LORAS.map((lora) => (
        <div
          key={lora.id}
          className={`relative bg-white/[0.03] backdrop-blur-sm rounded-2xl p-7 border transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1 hover:shadow-2xl hover:shadow-reed-red/5 flex flex-col ${
            lora.popular ? 'border-reed-red/50' : 'border-white/[0.06]'
          }`}
        >
          {lora.popular && (
            <div className="absolute -top-3 left-6 px-3 py-1 bg-reed-red text-white text-xs font-bold rounded-full shadow-lg shadow-reed-red/30">
              Most Popular
            </div>
          )}
          <h3 className="font-display text-xl font-bold text-white mb-2">{lora.name}</h3>
          <p className="text-white/40 text-sm mb-5 flex-grow leading-relaxed">{lora.description}</p>

          {lora.originalPrice && (
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm text-white/30 line-through">{lora.originalPrice}</span>
              <span className="px-2 py-0.5 bg-reed-red text-white text-xs font-bold rounded">
                SAVE {lora.discountPercent?.replace(' OFF', '')}
              </span>
            </div>
          )}
          <div className="text-3xl font-bold text-white mb-6">{lora.price}</div>

          <ul className="space-y-3 mb-7">
            {lora.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-white/50">
                <Check className="w-4 h-4 text-reed-red flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => onBuyService(lora)}
            className="w-full py-3.5 font-semibold rounded-xl bg-reed-red text-white hover:bg-reed-red-dark transition-colors mt-auto shadow-lg shadow-reed-red/20"
          >
            Buy Now
          </button>
        </div>
      ))}
    </div>
  </div>
);

// ─── Store View: Workflows ───────────────────────────────────────────────────
const WorkflowsStoreView = ({ onBuyService }: { onBuyService: (service: ServiceItem) => void }) => (
  <div className="p-6 lg:p-10 max-w-6xl mx-auto">
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-reed-red/10 flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-reed-red" />
        </div>
        <h1 className="font-display text-3xl font-bold text-white">ComfyUI Workflows</h1>
      </div>
      <p className="text-white/50 text-sm mt-2 max-w-xl">
        Hand-crafted ComfyUI workflows ready to plug and play. Zero node experience needed. Just import, load your LoRA, and generate.
      </p>
    </div>

    <div className="inline-flex items-center gap-2 px-4 py-2 bg-reed-red/10 border border-reed-red/30 rounded-full text-sm font-semibold text-reed-red mb-8">
      <span className="w-2 h-2 bg-reed-red rounded-full animate-pulse" />
      Launch Sale — Limited Time Pricing
    </div>

    <div className="grid md:grid-cols-3 gap-6">
      {WORKFLOWS.map((wf) => (
        <div
          key={wf.id}
          className={`relative bg-white/[0.03] backdrop-blur-sm rounded-2xl p-7 border transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1 hover:shadow-2xl hover:shadow-reed-red/5 flex flex-col ${
            wf.popular ? 'border-reed-red/50' : 'border-white/[0.06]'
          }`}
        >
          {wf.popular && (
            <div className="absolute -top-3 left-6 px-3 py-1 bg-reed-red text-white text-xs font-bold rounded-full shadow-lg shadow-reed-red/30">
              Most Popular
            </div>
          )}
          <h3 className="font-display text-xl font-bold text-white mb-2">{wf.name}</h3>
          <p className="text-white/40 text-sm mb-5 flex-grow leading-relaxed">{wf.description}</p>

          {wf.originalPrice && (
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm text-white/30 line-through">{wf.originalPrice}</span>
              <span className="px-2 py-0.5 bg-reed-red text-white text-xs font-bold rounded">
                SAVE {wf.discountPercent?.replace(' OFF', '')}
              </span>
            </div>
          )}
          <div className="text-3xl font-bold text-white mb-6">{wf.price}</div>

          <ul className="space-y-3 mb-7">
            {wf.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-white/50">
                <Check className="w-4 h-4 text-reed-red flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => onBuyService(wf)}
            className={`w-full py-3.5 font-semibold rounded-xl transition-colors mt-auto ${
              wf.popular
                ? 'bg-reed-red text-white hover:bg-reed-red-dark shadow-lg shadow-reed-red/20'
                : 'border border-white/10 text-white hover:border-reed-red hover:text-reed-red'
            }`}
          >
            {wf.popular ? 'Get Started' : 'Buy Now'}
          </button>
        </div>
      ))}
    </div>

    {/* Packages preview */}
    <div className="mt-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <Box className="w-5 h-5 text-reed-red" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white">Complete Packages</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative bg-white/[0.03] rounded-2xl p-7 border transition-all flex flex-col ${
              pkg.popular ? 'border-reed-red/50' : 'border-white/[0.06]'
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-6 px-3 py-1 bg-reed-red text-white text-xs font-bold rounded-full">
                Recommended
              </div>
            )}
            <h3 className="font-display text-xl font-bold text-white mb-2">{pkg.name}</h3>
            <p className="text-white/40 text-sm mb-5 flex-grow">{pkg.description}</p>
            <div className="text-3xl font-bold text-white mb-6">{pkg.price}</div>
            <ul className="space-y-3 mb-7">
              {pkg.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-white/50">
                  <Check className="w-4 h-4 text-reed-red flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="w-full py-3.5 font-semibold rounded-xl border border-white/10 text-white/30 cursor-not-allowed mt-auto"
            >
              Coming Soon
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Credits / Billing View ──────────────────────────────────────────────────
interface PricingPlan {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  period: string;
  credits: string;
  creditsValue: number;
  nsfw: boolean | string;
  features: string[];
  cta: string;
  popular: boolean;
}

const CreditsView = () => {
  const { user } = useAuth();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  const plans: PricingPlan[] = [
    { id: "free", name: "Free", price: "$0", priceValue: 0, period: "/month", credits: "3", creditsValue: 3, nsfw: "Soon", features: ["Standard resolution", "Single pose per generation", "Auto-generated prompt"], cta: "Current Plan", popular: false },
    { id: "starter", name: "Starter", price: "$29", priceValue: 29, period: "/month", credits: "50", creditsValue: 50, nsfw: "Soon", features: ["1K max resolution", "Single pose per generation", "Custom instructions"], cta: "Choose Starter", popular: false },
    { id: "creator", name: "Creator", price: "$59", priceValue: 59, period: "/month", credits: "120", creditsValue: 120, nsfw: "Soon", features: ["Up to 4K resolution", "Pose Variation included", "Full creative control"], cta: "Choose Creator", popular: true },
    { id: "pro", name: "Pro", price: "$99", priceValue: 99, period: "/month", credits: "250", creditsValue: 250, nsfw: "Soon", features: ["All Creator features", "Pose Variation included", "Priority support"], cta: "Choose Pro", popular: false },
    { id: "studio", name: "Studio", price: "$199", priceValue: 199, period: "/month", credits: "600", creditsValue: 600, nsfw: "Soon", features: ["All Pro features", "Pose Variation included", "1:1 call support"], cta: "Choose Studio", popular: false },
  ];

  const handleSelectPlan = (plan: PricingPlan) => {
    if (plan.priceValue === 0) return;
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-reed-red/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-reed-red" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Upgrade & Credits</h1>
        </div>
        <p className="text-white/50 text-sm mt-2 max-w-xl">
          Subscribe to a plan and get credits to generate images directly on our platform. No ComfyUI setup needed.
        </p>
      </div>

      {/* Current plan info */}
      {user && (
        <div className="mb-10 p-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl inline-flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-reed-red/10 flex items-center justify-center">
            <Crown className="w-6 h-6 text-reed-red" />
          </div>
          <div>
            <div className="text-sm text-white/50">Current plan</div>
            <div className="text-lg font-bold text-white capitalize">{user.plan_type}</div>
          </div>
          <div className="w-px h-10 bg-white/10 mx-2" />
          <div>
            <div className="text-sm text-white/50">Credits remaining</div>
            <div className="text-lg font-bold text-reed-red">{user.credits}</div>
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white/[0.03] rounded-2xl p-6 border transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1 flex flex-col ${
              plan.popular ? 'border-reed-red/50 shadow-lg shadow-reed-red/5' : 'border-white/[0.06]'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-6 px-3 py-1 bg-reed-red text-white text-xs font-bold rounded-full shadow-lg shadow-reed-red/30">
                Best Value
              </div>
            )}
            <h3 className="font-display text-xl font-bold text-white mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-white">{plan.price}</span>
              <span className="text-white/30">{plan.period}</span>
            </div>

            <div className="space-y-2 mb-5 pb-5 border-b border-white/[0.06]">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Credits/mo</span>
                <span className="font-semibold text-white">{plan.credits}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">NSFW</span>
                <span className="font-semibold text-amber-500">{typeof plan.nsfw === 'string' ? plan.nsfw : plan.nsfw ? 'Yes' : 'No'}</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6 flex-grow">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-white/50">
                  <Check className="w-4 h-4 text-reed-red flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan(plan)}
              disabled={user?.plan_type === plan.id}
              className={`w-full py-3 font-semibold rounded-xl transition-colors mt-auto ${
                user?.plan_type === plan.id
                  ? 'border border-white/10 text-white/30 cursor-not-allowed'
                  : plan.popular
                    ? 'bg-reed-red text-white hover:bg-reed-red-dark shadow-lg shadow-reed-red/20'
                    : 'border border-white/10 text-white hover:border-reed-red hover:text-reed-red'
              }`}
            >
              {user?.plan_type === plan.id ? 'Current Plan' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Guarantee */}
      <div className="mt-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-full text-sm">
          <Check className="w-4 h-4" />
          14-day guarantee on all plans
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); setSelectedPlan(null); }}
          plan={{ id: selectedPlan.id, name: selectedPlan.name, price: selectedPlan.priceValue, credits: selectedPlan.creditsValue }}
          onPaymentComplete={() => window.location.reload()}
        />
      )}
    </div>
  );
};

// ─── Sidebar Navigation Item ─────────────────────────────────────────────────
const SidebarItem = ({
  icon, label, active, onClick, badge, collapsed
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
  collapsed: boolean;
}) => (
  <button
    onClick={onClick}
    className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
      active
        ? 'bg-white/[0.06] text-white'
        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
    } ${collapsed ? 'justify-center' : ''}`}
    title={collapsed ? label : undefined}
  >
    {/* Active indicator bar */}
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-reed-red rounded-r-full" />
    )}
    <span className={`flex-shrink-0 transition-colors ${active ? 'text-reed-red' : 'text-white/30 group-hover:text-white/50'}`}>
      {icon}
    </span>
    {!collapsed && (
      <>
        <span className="truncate">{label}</span>
        {badge && (
          <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-reed-red/15 text-reed-red uppercase tracking-wider">
            {badge}
          </span>
        )}
      </>
    )}
  </button>
);

// ─── Main Dashboard Layout ───────────────────────────────────────────────────
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ onBackToLanding }) => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('generator');
  const sidebarCollapsed = false;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Service purchase flow state
  const [selectedServiceForPayment, setSelectedServiceForPayment] = useState<ServiceItem | null>(null);
  const [showServicePayment, setShowServicePayment] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  // Sub-navigation for purchases
  const [purchaseSubView, setPurchaseSubView] = useState<'list' | 'content' | 'upload'>('list');
  const [activePurchaseId, setActivePurchaseId] = useState('');
  const [activeServiceId, setActiveServiceId] = useState('');

  const handleBuyService = useCallback((service: ServiceItem) => {
    setSelectedServiceForPayment(service);
    setShowServicePayment(true);
  }, []);

  const handlePaymentInitiated = useCallback((serviceId: string) => {
    setShowServicePayment(false);
    const service = selectedServiceForPayment || getServiceById(serviceId);
    if (service) {
      setSelectedServiceForPayment(service);
      setShowThankYou(true);
    }
  }, [selectedServiceForPayment]);

  const handleViewContent = useCallback((purchaseId: string, serviceId: string) => {
    setActivePurchaseId(purchaseId);
    setActiveServiceId(serviceId);
    setPurchaseSubView('content');
  }, []);

  const handleUploadPhotos = useCallback((purchaseId: string, serviceId: string) => {
    setActivePurchaseId(purchaseId);
    setActiveServiceId(serviceId);
    setPurchaseSubView('upload');
  }, []);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    setPurchaseSubView('list');
    setMobileSidebarOpen(false);
  };

  // ─── Render content based on active tab ────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'generator':
        return <App onBackToLanding={onBackToLanding} hideBackButton />;

      case 'loras':
        return <LorasStoreView onBuyService={handleBuyService} />;

      case 'workflows':
        return <WorkflowsStoreView onBuyService={handleBuyService} />;

      case 'credits':
        return <CreditsView />;

      case 'purchases':
        if (purchaseSubView === 'content' && activePurchaseId && activeServiceId) {
          return (
            <ServiceContent
              purchaseId={activePurchaseId}
              serviceId={activeServiceId}
              onBack={() => setPurchaseSubView('list')}
            />
          );
        }
        if (purchaseSubView === 'upload' && activePurchaseId && activeServiceId) {
          return (
            <LoraUploadFlow
              purchaseId={activePurchaseId}
              serviceId={activeServiceId}
              onBack={() => setPurchaseSubView('list')}
              onComplete={() => setPurchaseSubView('list')}
            />
          );
        }
        return (
          <MyPurchases
            onBack={() => handleTabChange('generator')}
            onViewContent={handleViewContent}
            onUploadPhotos={handleUploadPhotos}
          />
        );

      case 'admin':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-reed-red animate-spin" /></div>}>
            <AdminPanel isOpen={true} onClose={() => handleTabChange('generator')} />
          </Suspense>
        );

      default:
        return null;
    }
  };

  const sidebarWidth = 'w-[240px]';

  return (
    <div className="flex h-screen bg-[#060606] overflow-hidden">
      {/* ─── Mobile sidebar overlay ─────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:relative z-50 lg:z-auto flex flex-col h-full bg-[#080808] border-r border-white/[0.04] transition-all duration-300 ${sidebarWidth} ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-14 px-5 border-b border-white/[0.06]">
          <img
            src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png"
            alt="REED"
            className="h-6 w-auto flex-shrink-0"
          />
          <span className="font-display font-bold text-base text-white tracking-tight">REED</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <SidebarItem
            icon={<Wand2 className="w-[16px] h-[16px]" />}
            label="AI Generator"
            active={activeTab === 'generator'}
            onClick={() => handleTabChange('generator')}
            collapsed={sidebarCollapsed}
          />
          <SidebarItem
            icon={<Package className="w-[16px] h-[16px]" />}
            label="My Purchases"
            active={activeTab === 'purchases'}
            onClick={() => handleTabChange('purchases')}
            collapsed={sidebarCollapsed}
          />

          <div className="h-px bg-white/[0.04] my-3 mx-2" />
          <div className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em] px-3 mb-1.5">Store</div>

          <SidebarItem
            icon={<Fingerprint className="w-[16px] h-[16px]" />}
            label="Custom LoRAs"
            active={activeTab === 'loras'}
            onClick={() => handleTabChange('loras')}
            badge="SALE"
            collapsed={sidebarCollapsed}
          />
          <SidebarItem
            icon={<GitBranch className="w-[16px] h-[16px]" />}
            label="Workflows"
            active={activeTab === 'workflows'}
            onClick={() => handleTabChange('workflows')}
            collapsed={sidebarCollapsed}
          />

          <div className="h-px bg-white/[0.04] my-3 mx-2" />
          <div className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em] px-3 mb-1.5">Account</div>

          <SidebarItem
            icon={<CreditCard className="w-[16px] h-[16px]" />}
            label="Plans & Credits"
            active={activeTab === 'credits'}
            onClick={() => handleTabChange('credits')}
            collapsed={sidebarCollapsed}
          />

          {user?.is_admin && (
            <>
              <div className="h-px bg-white/[0.04] my-3 mx-2" />
              <div className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em] px-3 mb-1.5">Admin</div>
              <SidebarItem
                icon={<Shield className="w-[16px] h-[16px]" />}
                label="Admin Panel"
                active={activeTab === 'admin'}
                onClick={() => handleTabChange('admin')}
                collapsed={sidebarCollapsed}
              />
            </>
          )}

          <a
            href="https://discord.gg/pqSwuGxrmh"
            target="_blank"
            rel="noopener noreferrer"
            className="group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-[#5865F2] hover:bg-[#5865F2]/10 transition-all duration-200"
          >
            <svg className="w-[16px] h-[16px] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span className="truncate">Discord</span>
          </a>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/[0.06] px-3 py-3 space-y-1">
          <button
            onClick={onBackToLanding}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span>Back to Website</span>
          </button>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-white/30 hover:text-red-400 hover:bg-white/[0.03] transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between h-14 px-4 bg-[#080808] border-b border-white/[0.04]">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 text-white/50 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png"
              alt="REED"
              className="h-6 w-auto"
            />
            <span className="font-display font-bold text-white">REED</span>
          </div>
          {user && (
            <div className="flex items-center gap-1 px-2 py-1 bg-white/[0.03] rounded-lg">
              <Zap className="w-3.5 h-3.5 text-reed-red" />
              <span className="text-xs font-medium text-white/70">{user.credits}</span>
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          {renderContent()}
        </div>
      </main>

      {/* ─── Service Payment Modal ──────────────────────────────────────── */}
      {selectedServiceForPayment && (
        <ServicePaymentModal
          isOpen={showServicePayment}
          onClose={() => { setShowServicePayment(false); setSelectedServiceForPayment(null); }}
          service={selectedServiceForPayment}
          onPaymentInitiated={handlePaymentInitiated}
        />
      )}

      {/* ─── Thank You Modal ────────────────────────────────────────────── */}
      {selectedServiceForPayment && (
        <ServiceThankYouModal
          isOpen={showThankYou}
          service={selectedServiceForPayment}
          onClose={() => { setShowThankYou(false); setSelectedServiceForPayment(null); }}
          onGoToUpload={() => {
            setShowThankYou(false);
            setActiveTab('purchases');
            setPurchaseSubView('list');
          }}
          onGoToPurchases={() => {
            setShowThankYou(false);
            setSelectedServiceForPayment(null);
            setActiveTab('purchases');
            setPurchaseSubView('list');
          }}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
