import React, { useState, useEffect, useCallback } from 'react';
import {
  Menu, X, ChevronDown, ChevronUp, Check, Sparkles,
  Zap, Crown, Shield, Clock, Users, Star, ArrowRight,
  Play, Download, Layers, Cpu, Lock, Mail, Flame,
  User, LogOut, CreditCard, Crown as CrownIcon, Package
} from 'lucide-react';
import App from './App';
import { useAuth } from './contexts/AuthContext';
import { LoginPage, RegisterPage } from './components/AuthPages';
import { ThemeToggle } from './components/ThemeToggle';
import { supabase } from './services/supabaseClient';
import { PortfolioShowcase } from './components/PortfolioShowcase';
import { HeroBackground } from './components/HeroBackground';
import { PaymentModal } from './components/PaymentModal';
import { RevenueShowcase } from './components/RevenueShowcase';
import { ServicePaymentModal } from './components/ServicePaymentModal';
import { ServiceThankYouModal } from './components/ServiceThankYouModal';
import { MyPurchases } from './components/MyPurchases';
import { ServiceContent } from './components/ServiceContent';
import { LoraUploadFlow } from './components/LoraUploadFlow';
import { WORKFLOWS, LORAS, PACKAGES, ServiceItem, getServiceById } from './services/servicesData';

// Navigation Component
const Navigation = ({
  onLaunchApp,
  onLoginClick,
  onRegisterClick,
  onMyPurchases
}: {
  onLaunchApp: () => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onMyPurchases: () => void;
}) => {
  const { user, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Services', href: '#services' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      isScrolled ? 'bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)]' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3">
            <img 
              src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png" 
              alt="REED" 
              className="h-8 w-auto"
            />
            <span className="font-display font-bold text-xl tracking-tight text-[var(--text-primary)]">REED</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-[var(--text-secondary)] hover:text-reed-red transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-full">
                    <CreditCard className="w-4 h-4 text-reed-red" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {user.credits} credits
                    </span>
                  </div>
                  <button
                    onClick={onMyPurchases}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-reed-red transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    My Purchases
                  </button>
                  <button
                    onClick={onLaunchApp}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-reed-red text-white text-sm font-medium rounded-lg hover:bg-reed-red-dark transition-colors shadow-lg shadow-reed-red/25"
                  >
                    <Sparkles className="w-4 h-4" />
                    AI Generator
                  </button>
                  <button
                    onClick={signOut}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title="Sign out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={onLoginClick}
                  className="text-sm font-medium text-[var(--text-secondary)] hover:text-reed-red transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={onRegisterClick}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-reed-red text-white text-sm font-medium rounded-lg hover:bg-reed-red-dark transition-colors shadow-lg shadow-reed-red/25"
                >
                  Start Free
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-[var(--text-secondary)]"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[var(--bg-primary)] border-t border-[var(--border-color)]">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-base font-medium text-[var(--text-secondary)] hover:text-reed-red"
              >
                {link.name}
              </a>
            ))}
            
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded-lg">
                  <CreditCard className="w-4 h-4 text-reed-red" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {user.credits} credits
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onMyPurchases();
                  }}
                  className="block w-full text-left text-base font-medium text-[var(--text-secondary)] hover:text-reed-red py-2"
                >
                  My Purchases
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLaunchApp();
                  }}
                  className="block w-full text-left text-base font-medium text-reed-red hover:text-reed-red-dark py-2 font-semibold"
                >
                  AI Generator
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut();
                  }}
                  className="block w-full text-left text-base font-medium text-[#a11008] py-2"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLoginClick();
                  }}
                  className="block w-full text-left text-base font-medium text-[var(--text-secondary)] hover:text-reed-red py-2"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onRegisterClick();
                  }}
                  className="block w-full text-center px-5 py-3 bg-reed-red text-white text-sm font-medium rounded-lg"
                >
                  Start Free
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

// Hero Section
const HeroSection = ({ onLaunchApp }: { onLaunchApp: () => void }) => {
  const [spotsRemaining] = useState(50);

  return (
    <section className="relative min-h-screen flex flex-col justify-between pt-20 overflow-hidden">
      {/* Animated Background */}
      <HeroBackground />

      {/* Contenido del hero */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex-1 flex items-center">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-reed-red/10 rounded-full mb-8 animate-fade-in border border-reed-red/20 backdrop-blur-sm">
            <Flame className="w-4 h-4 text-reed-red animate-pulse" />
            <span className="text-sm font-medium text-reed-red">Exclusive Beta — Only {spotsRemaining} spots available</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold text-[var(--text-primary)] leading-[1.1] mb-6 animate-slide-up">
            Generate & Scale
            <br />
            <span className="text-gradient">Consistent AI Content</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-[var(--text-primary)]/80 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Generate images directly on our platform or get custom SDXL LoRAs and workflows built for you.
            Same face, same style, every single time — no more inconsistent results.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={onLaunchApp}
              className="px-8 py-4 bg-reed-red text-white font-semibold rounded-xl hover:bg-reed-red-dark transition-colors shadow-lg shadow-reed-red/25"
            >
              Start Generating
            </button>
            <a
              href="#services"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-[var(--border-color)] text-[var(--text-primary)] font-semibold rounded-xl hover:border-[var(--text-muted)] transition-colors"
            >
              View Services
            </a>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[var(--text-primary)]/70 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-reed-red" />
              <span>On-Site Generator</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-reed-red" />
              <span>100% Consistent</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-reed-red" />
              <span>24-48h LoRA Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle fade to carousel */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[var(--bg-primary)] pointer-events-none z-10" />
    </section>
  );
};

// Portfolio Section with SFW/NSFW Toggle
const PortfolioSection = () => {
  const [category, setCategory] = useState<'sfw' | 'nsfw'>('sfw');
  const [showAgeWarning, setShowAgeWarning] = useState(false);

  const handleNsfwClick = () => {
    if (category === 'sfw') {
      setShowAgeWarning(true);
    } else {
      setCategory('sfw');
    }
  };

  const confirmAge = () => {
    setShowAgeWarning(false);
    setCategory('nsfw');
  };

  return (
    <section className="relative bg-[var(--bg-primary)]">
      {/* Toggle Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex items-center justify-center gap-2">
          {/* SFW Button */}
          <button
            onClick={() => setCategory('sfw')}
            className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-l-xl transition-all ${
              category === 'sfw'
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            SFW
          </button>

          {/* NSFW Button */}
          <button
            onClick={handleNsfwClick}
            className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-r-xl transition-all ${
              category === 'nsfw'
                ? 'bg-reed-red text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-reed-red border border-[var(--border-color)] hover:border-reed-red'
            }`}
          >
            <Flame className="w-4 h-4" />
            NSFW
          </button>
        </div>

        {category === 'nsfw' && (
          <p className="text-center text-sm text-[var(--text-muted)] mt-4">
            You are viewing NSFW content. Must be 18+ to view.
          </p>
        )}
      </div>

      {/* Portfolio Carousel */}
      <PortfolioShowcase category={category} className="pt-0 pb-8" />

      {/* Age Verification Modal */}
      {showAgeWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--bg-primary)] rounded-2xl p-8 max-w-md mx-4 border border-[var(--border-color)] shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-reed-red/10 rounded-full">
              <Flame className="w-8 h-8 text-reed-red" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-3">
              Age Verification
            </h3>
            <p className="text-[var(--text-secondary)] text-center mb-8">
              This section contains adult content (NSFW). You must be at least 18 years old to continue.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAgeWarning(false)}
                className="flex-1 px-6 py-3 border-2 border-[var(--border-color)] text-[var(--text-primary)] font-semibold rounded-xl hover:border-[var(--text-muted)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAge}
                className="flex-1 px-6 py-3 bg-reed-red text-white font-semibold rounded-xl hover:bg-reed-red-dark transition-colors"
              >
                I am 18+
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// Services Section
const ServicesSection = ({ onBuyService }: { onBuyService: (service: ServiceItem) => void }) => {
  return (
    <section id="services" className="pt-16 pb-24 lg:pt-20 lg:pb-32 bg-[var(--bg-primary)] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-reed-red uppercase tracking-wider mb-4">Services</span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
            Done-For-You Services
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Don't want to generate yourself? We build it for you — custom SDXL LoRAs, workflows, and full content packs ready to post.
          </p>
        </div>

        {/* Workflows */}
        <div className="mb-20">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <h3 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
              <Layers className="w-6 h-6 text-reed-red" />
              SDXL Workflows (One-Time)
            </h3>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-xs font-semibold text-[var(--text-secondary)]">
              <Cpu className="w-3.5 h-3.5" />
              ComfyUI Ready
            </span>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {WORKFLOWS.map((workflow) => (
              <div key={workflow.id} className={`relative bg-[var(--card-bg)] rounded-2xl p-6 border-2 transition-all hover:shadow-xl flex flex-col ${
                workflow.popular ? 'border-reed-red' : 'border-[var(--card-border)]'
              }`}>
                {workflow.popular && (
                  <div className="absolute -top-3 left-6 px-3 py-1 bg-reed-red text-white text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <h4 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">{workflow.name}</h4>
                <p className="text-[var(--text-secondary)] text-sm mb-4 flex-grow">{workflow.description}</p>
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-6">{workflow.price}</div>
                <ul className="space-y-3 mb-6">
                  {workflow.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-reed-red flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onBuyService(workflow)}
                  className={`w-full py-3 font-semibold rounded-xl transition-colors mt-auto ${workflow.popular ? 'bg-reed-red text-white hover:bg-reed-red-dark' : 'border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:border-reed-red hover:text-reed-red'}`}
                >
                  {workflow.popular ? 'Get Started' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* LoRAs */}
        <div className="mb-20">
          <h3 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-8 flex items-center gap-3">
            <Cpu className="w-6 h-6 text-reed-red" />
            Custom SDXL LoRAs
          </h3>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
            {LORAS.map((lora) => (
              <div key={lora.id} className="bg-[var(--card-bg)] rounded-2xl p-6 border-2 border-[var(--card-border)] hover:border-reed-red transition-all hover:shadow-xl flex flex-col">
                <h4 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">{lora.name}</h4>
                <p className="text-[var(--text-secondary)] text-sm mb-4 flex-grow">{lora.description}</p>
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-6">{lora.price}</div>
                <ul className="space-y-3 mb-6">
                  {lora.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-reed-red flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onBuyService(lora)}
                  className="w-full py-3 font-semibold rounded-xl bg-reed-red text-white hover:bg-reed-red-dark transition-colors mt-auto"
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Packages */}
        <div>
          <h3 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-8 flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-reed-red" />
            Complete Custom Packages
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {PACKAGES.map((pkg) => (
              <div key={pkg.id} className={`relative bg-[var(--card-bg)] rounded-2xl p-6 border-2 transition-all hover:shadow-xl flex flex-col ${
                pkg.popular ? 'border-reed-red' : 'border-[var(--card-border)]'
              }`}>
                {pkg.popular && (
                  <div className="absolute -top-3 left-6 px-3 py-1 bg-reed-red text-white text-xs font-semibold rounded-full">
                    Recommended
                  </div>
                )}
                <h4 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">{pkg.name}</h4>
                <p className="text-[var(--text-secondary)] text-sm mb-4 flex-grow">{pkg.description}</p>
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-6">{pkg.price}</div>
                <ul className="space-y-3 mb-6">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-reed-red flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onBuyService(pkg)}
                  className={`w-full py-3 font-semibold rounded-xl transition-colors mt-auto ${pkg.popular ? 'bg-reed-red text-white hover:bg-reed-red-dark' : 'border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:border-reed-red hover:text-reed-red'}`}
                >
                  {pkg.popular ? 'Get Started' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Plan type for pricing
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

// Pricing Section (Subscriptions)
const PricingSection = ({ onLoginClick }: { onLoginClick: () => void }) => {
  const { user } = useAuth();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  const handleSelectPlan = (plan: PricingPlan) => {
    if (!user) {
      onLoginClick();
      return;
    }

    // Free plan - just activate
    if (plan.priceValue === 0) {
      return;
    }

    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = () => {
    // Refresh user data to get updated credits
    window.location.reload();
  };

  const plans: PricingPlan[] = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      priceValue: 0,
      period: "/month",
      credits: "3",
      creditsValue: 3,
      nsfw: "Soon",
      features: [
        "Standard resolution",
        "Fixed pose",
        "Auto-generated prompt"
      ],
      cta: "Start Free",
      popular: false
    },
    {
      id: "starter",
      name: "Starter",
      price: "$29",
      priceValue: 29,
      period: "/month",
      credits: "50",
      creditsValue: 50,
      nsfw: "Soon",
      features: [
        "1K max resolution",
        "Editable pose",
        "Custom prompt editing"
      ],
      cta: "Choose Starter",
      popular: false
    },
    {
      id: "creator",
      name: "Creator",
      price: "$59",
      priceValue: 59,
      period: "/month",
      credits: "120",
      creditsValue: 120,
      nsfw: "Soon",
      features: [
        "4K resolution",
        "Full creative control",
        "Faster generation"
      ],
      cta: "Choose Creator",
      popular: true
    },
    {
      id: "pro",
      name: "Pro",
      price: "$99",
      priceValue: 99,
      period: "/month",
      credits: "250",
      creditsValue: 250,
      nsfw: "Soon",
      features: [
        "All Creator features",
        "Priority support",
        "Fastest generation"
      ],
      cta: "Choose Pro",
      popular: false
    },
    {
      id: "studio",
      name: "Studio",
      price: "$199",
      priceValue: 199,
      period: "/month",
      credits: "600",
      creditsValue: 600,
      nsfw: "Soon",
      features: [
        "All Pro features",
        "1:1 call support",
        "Maximum resolution"
      ],
      cta: "Choose Studio",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="pt-16 pb-32 lg:pt-20 lg:pb-48 bg-[var(--bg-primary)] scroll-mt-20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 w-full">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <span className="inline-block text-sm font-semibold text-reed-red uppercase tracking-wider mb-4">Subscriptions</span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
            On-Site Generation
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            SFW now, NSFW coming soon. Choose the plan that best fits your needs.
          </p>

          {user && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] rounded-full">
              <CrownIcon className="w-5 h-5 text-reed-red" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Your current plan: <span className="font-bold capitalize">{user.plan_type}</span>
                {user.plan_type !== 'studio' && ` (${user.credits} credits remaining)`}
              </span>
            </div>
          )}
        </div>

        {/* Pricing Grid - All 5 in one row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 items-start">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative bg-[var(--card-bg)] rounded-2xl p-6 border-2 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col ${
              plan.popular ? 'border-reed-red xl:scale-[1.02] xl:z-10 shadow-lg shadow-reed-red/10' : 'border-[var(--card-border)]'
            }`}>
              {plan.popular && (
                <div className="absolute -top-3 left-6 px-3 py-1 bg-reed-red text-white text-xs font-semibold rounded-full">
                  Best Value
                </div>
              )}

              <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">{plan.name}</h3>

              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-[var(--text-primary)]">{plan.price}</span>
                <span className="text-[var(--text-muted)]">{plan.period}</span>
              </div>

              <div className="space-y-2 mb-6 pb-6 border-b border-[var(--border-color)]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Credits/month:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{plan.credits}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">NSFW:</span>
                  <span className={`font-semibold ${plan.nsfw === true || plan.nsfw === 'Full' ? 'text-green-500' : plan.nsfw === 'Soon' ? 'text-amber-500' : 'text-gray-400'}`}>
                    {plan.nsfw === true ? 'Yes' : plan.nsfw === false ? 'No' : plan.nsfw}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Check className="w-4 h-4 text-reed-red flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan)}
                className={`w-full py-3 font-semibold rounded-xl transition-colors mt-auto ${plan.popular ? 'bg-reed-red text-white hover:bg-reed-red-dark' : 'border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:border-reed-red hover:text-reed-red'}`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <div className="mt-12 lg:mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-500 rounded-full text-sm">
            <Shield className="w-4 h-4" />
            14-day guarantee on all plans
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          plan={{
            id: selectedPlan.id,
            name: selectedPlan.name,
            price: selectedPlan.priceValue,
            credits: selectedPlan.creditsValue,
          }}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </section>
  );
};

// FAQ Section
const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "What is REED?",
      answer: "REED is an AI image generation platform for creators. You can generate images directly on our site, or hire us to build custom SDXL LoRAs and workflows tailored to your character. The result: every image looks like it belongs to the same person — no more random faces."
    },
    {
      question: "What makes REED different from other AI tools?",
      answer: "Consistency. Most AI generators give you a different face every time. Our custom SDXL LoRAs and prompt engineering ensure your character looks identical across hundreds of images — same face, same style, any pose or scene."
    },
    {
      question: "How does the service work?",
      answer: "Choose what you need (SDXL workflow, LoRA, or full package), send us the reference material, and we handle the rest. LoRAs are delivered in 24-48h, workflows are ready to use in ComfyUI immediately."
    },
    {
      question: "Do I need my own AI setup?",
      answer: "For on-site generation, no — just pick a subscription plan and generate directly on our platform. For workflows and LoRAs, you'll use them in ComfyUI on your own machine or cloud setup."
    },
    {
      question: "How much does REED cost?",
      answer: "LoRAs start at $47, workflows at $397, and full packages from $297. On-site generation subscriptions go from free (3 credits) to $199/month (600 credits)."
    },
    {
      question: "What about my data and privacy?",
      answer: "Your images and data are never shared with anyone. All processing happens on secure servers. You can request complete deletion of your data at any time."
    },
    {
      question: "Is there a guarantee?",
      answer: "Yes. 14-day guarantee on all services. If the results don't meet expectations, we refund you. LoRAs include revisions based on your plan."
    },
    {
      question: "What model do you use?",
      answer: "All our LoRAs, workflows, and prompts are built for SDXL (Stable Diffusion XL). We don't build models from scratch — we fine-tune and optimize SDXL to deliver consistent, high-quality results for your specific needs."
    }
  ];

  return (
    <section id="faq" className="pt-16 pb-24 lg:pt-20 lg:pb-32 bg-[var(--bg-primary)] scroll-mt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-reed-red uppercase tracking-wider mb-4">FAQ</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-[var(--text-secondary)]">
            Everything you need to know about our services.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-[var(--hover-bg)] transition-colors"
              >
                <span className="font-semibold text-[var(--text-primary)] pr-4">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-reed-red flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="text-[var(--text-secondary)] leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// CTA Section
const CTASection = () => {
  return (
    <section className="py-24 bg-reed-red relative overflow-hidden">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Start generating consistent content today
        </h2>
        <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
          Generate on our platform or let us build your custom LoRA and workflow.
          Either way, every image stays on-brand. Only 50 beta spots left.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-reed-red font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
          >
            Join the Beta
            <ArrowRight className="w-5 h-5" />
          </a>
          <a
            href="#services"
            className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-xl hover:border-white hover:bg-white/10 transition-colors"
          >
            View Services
          </a>
        </div>
      </div>
    </section>
  );
};

// Footer
const Footer = () => {
  return (
    <footer className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png" alt="REED" className="h-8 w-auto brightness-0 invert dark:brightness-100 dark:invert-0" />
              <span className="font-display font-bold text-xl">REED</span>
            </div>
            <p className="text-[var(--text-secondary)] max-w-sm mb-6">
              AI image generation platform for creators.
              Generate on-site or get custom SDXL LoRAs and workflows built for you.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="#" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <span className="sr-only">Discord</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-3">
              <li><a href="#services" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Workflows</a></li>
              <li><a href="#services" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">LoRAs</a></li>
              <li><a href="#services" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Packages</a></li>
              <li><a href="#pricing" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Subscriptions</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Privacy</a></li>
              <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Terms</a></li>
              <li><a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">GDPR</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-[var(--border-color)] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[var(--text-muted)] text-sm">
            © 2026 REED. All rights reserved.
          </p>
          <p className="text-[var(--text-muted)] text-sm">
            Consistency is everything.
          </p>
        </div>
      </div>
    </footer>
  );
};

// Main Landing Page Component
const LandingPage = () => {
  const { user, loading } = useAuth();
  const [showApp, setShowApp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Service purchase states
  const [showMyPurchases, setShowMyPurchases] = useState(false);
  const [showServiceContent, setShowServiceContent] = useState(false);
  const [showLoraUpload, setShowLoraUpload] = useState(false);
  const [selectedServiceForPayment, setSelectedServiceForPayment] = useState<ServiceItem | null>(null);
  const [showServicePayment, setShowServicePayment] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [activePurchaseId, setActivePurchaseId] = useState<string>('');
  const [activeServiceId, setActiveServiceId] = useState<string>('');

  // Check localStorage on mount to restore app view state
  useEffect(() => {
    const savedShowApp = localStorage.getItem('reed_show_app');
    if (savedShowApp === 'true' && user && !loading) {
      setShowApp(true);
    }
  }, [user, loading]);

  // Handle email confirmation from URL
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const hash = window.location.hash;

      // Only process if hash contains Supabase auth tokens (access_token or type=)
      // This excludes navigation hashes like #pricing, #services, #faq
      if (hash && (hash.includes('access_token') || hash.includes('type='))) {
        // Check if we already processed this confirmation
        const confirmationProcessed = sessionStorage.getItem('email_confirmation_processed');
        if (confirmationProcessed) {
          // Already processed, just clean the URL
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        try {
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.error('Error getting session:', error);
          } else if (data.session) {
            // Mark as processed to avoid showing again
            sessionStorage.setItem('email_confirmation_processed', 'true');
            // Clear the URL hash
            window.history.replaceState({}, document.title, window.location.pathname);
            // Show success message
            alert('Email confirmed successfully! Welcome to REED.');
            // Redirect to app
            setShowApp(true);
            localStorage.setItem('reed_show_app', 'true');
          }
        } catch (err) {
          console.error('Error:', err);
        }
      }
    };

    handleEmailConfirmation();
  }, []);

  // Auto-redirect to app only on initial login, not on every user change
  useEffect(() => {
    // Only redirect if user just logged in (was null before) and we're not already in the app
    if (user && !loading && !showApp && !localStorage.getItem('reed_show_app')) {
      setShowApp(true);
      localStorage.setItem('reed_show_app', 'true');
    }
  }, [user, loading]);

  // Handle showing app and saving to localStorage
  const handleShowApp = useCallback(() => {
    // Verificar si el usuario está autenticado
    if (!user) {
      // Si no está autenticado, mostrar modal de login
      setShowLogin(true);
      return;
    }
    setShowApp(true);
    localStorage.setItem('reed_show_app', 'true');
  }, [user]);

  // Handle going back to landing page
  const handleShowLanding = useCallback(() => {
    setShowApp(false);
    setShowMyPurchases(false);
    setShowServiceContent(false);
    setShowLoraUpload(false);
    // Don't remove from localStorage so we know user was in app
    localStorage.setItem('reed_show_app', 'false');
  }, []);

  // Handle buying a service
  const handleBuyService = useCallback((service: ServiceItem) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    setSelectedServiceForPayment(service);
    setShowServicePayment(true);
  }, [user]);

  // After payment is initiated
  const handlePaymentInitiated = useCallback((serviceId: string) => {
    setShowServicePayment(false);
    const service = selectedServiceForPayment || getServiceById(serviceId);
    if (service) {
      setSelectedServiceForPayment(service);
      setShowThankYou(true);
    }
  }, [selectedServiceForPayment]);

  // Navigate to My Purchases
  const handleShowMyPurchases = useCallback(() => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    setShowMyPurchases(true);
    setShowServiceContent(false);
    setShowLoraUpload(false);
  }, [user]);

  // Navigate to service content
  const handleViewContent = useCallback((purchaseId: string, serviceId: string) => {
    setActivePurchaseId(purchaseId);
    setActiveServiceId(serviceId);
    setShowServiceContent(true);
    setShowMyPurchases(false);
  }, []);

  // Navigate to LoRA upload
  const handleUploadPhotos = useCallback((purchaseId: string, serviceId: string) => {
    setActivePurchaseId(purchaseId);
    setActiveServiceId(serviceId);
    setShowLoraUpload(true);
    setShowMyPurchases(false);
  }, []);

  // After upload complete
  const handleUploadComplete = useCallback(() => {
    setShowLoraUpload(false);
    setShowMyPurchases(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <Navigation
          onLaunchApp={handleShowApp}
          onLoginClick={() => setShowLogin(true)}
          onRegisterClick={() => setShowRegister(true)}
          onMyPurchases={handleShowMyPurchases}
        />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <img src="https://res.cloudinary.com/dx30xwfbj/image/upload/v1769905568/REED_LOGO_RED_PNG_rj24o1.png" alt="REED" className="h-12 w-auto mx-auto mb-4 animate-pulse" />
            <p className="text-[var(--text-secondary)]">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (showApp) {
    return <App onBackToLanding={handleShowLanding} />;
  }

  // Service content view
  if (showServiceContent && activePurchaseId && activeServiceId) {
    return (
      <ServiceContent
        purchaseId={activePurchaseId}
        serviceId={activeServiceId}
        onBack={() => {
          setShowServiceContent(false);
          setShowMyPurchases(true);
        }}
      />
    );
  }

  // LoRA upload view
  if (showLoraUpload && activePurchaseId && activeServiceId) {
    return (
      <LoraUploadFlow
        purchaseId={activePurchaseId}
        serviceId={activeServiceId}
        onBack={() => {
          setShowLoraUpload(false);
          setShowMyPurchases(true);
        }}
        onComplete={handleUploadComplete}
      />
    );
  }

  // My Purchases view
  if (showMyPurchases) {
    return (
      <MyPurchases
        onBack={handleShowLanding}
        onViewContent={handleViewContent}
        onUploadPhotos={handleUploadPhotos}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300 scroll-smooth">
      <ThemeToggle />
      <Navigation
        onLaunchApp={handleShowApp}
        onLoginClick={() => setShowLogin(true)}
        onRegisterClick={() => setShowRegister(true)}
        onMyPurchases={handleShowMyPurchases}
      />

      {showLogin && (
        <LoginPage
          onClose={() => setShowLogin(false)}
          onSwitch={() => { setShowLogin(false); setShowRegister(true); }}
          onSuccess={() => {
            setShowLogin(false);
            handleShowApp();
          }}
        />
      )}

      {showRegister && (
        <RegisterPage
          onClose={() => setShowRegister(false)}
          onSwitch={() => { setShowRegister(false); setShowLogin(true); }}
        />
      )}

      <HeroSection onLaunchApp={handleShowApp} />
      <PortfolioSection />
      <RevenueShowcase />
      <PricingSection onLoginClick={() => setShowLogin(true)} />
      <ServicesSection onBuyService={handleBuyService} />
      <FAQSection />
      <CTASection />
      <Footer />

      {/* Service Payment Modal */}
      {selectedServiceForPayment && (
        <ServicePaymentModal
          isOpen={showServicePayment}
          onClose={() => {
            setShowServicePayment(false);
            setSelectedServiceForPayment(null);
          }}
          service={selectedServiceForPayment}
          onPaymentInitiated={handlePaymentInitiated}
        />
      )}

      {/* Service Thank You Modal */}
      {selectedServiceForPayment && (
        <ServiceThankYouModal
          isOpen={showThankYou}
          service={selectedServiceForPayment}
          onClose={() => {
            setShowThankYou(false);
            setSelectedServiceForPayment(null);
          }}
          onGoToUpload={() => {
            setShowThankYou(false);
            // For LoRA/package uploads, we need a purchase ID
            // Since the webhook hasn't fired yet, we'll go to My Purchases where they can upload later
            setShowMyPurchases(true);
          }}
          onGoToPurchases={() => {
            setShowThankYou(false);
            setSelectedServiceForPayment(null);
            setShowMyPurchases(true);
          }}
        />
      )}
    </div>
  );
};

export default LandingPage;
