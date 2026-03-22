import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu, X, ChevronDown, ChevronUp, Check,
  Zap, Crown, Shield, Clock, Users, Star, ArrowRight,
  Play, Download, Lock, Mail,
  User, LogOut, CreditCard, Crown as CrownIcon, Package,
  LayoutDashboard, Wand2, Fingerprint, GitBranch,
  Eye, EyeOff, Coins, CheckCircle2, ScanLine, Box
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import App from './App';
import DashboardLayout from './components/DashboardLayout';
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
import { usePortfolioImages } from './hooks/usePortfolioImages';
import { optimizeImageForCarousel } from './utils/imageOptimizer';

gsap.registerPlugin(useGSAP);

// Scroll-reveal hook using IntersectionObserver — simple, zero-bug approach
const useScrollReveal = (options?: { threshold?: number; rootMargin?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.unobserve(el);
        }
      },
      { threshold: options?.threshold ?? 0.1, rootMargin: options?.rootMargin ?? '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
};


// Navigation Component
const Navigation = ({
  onLaunchApp,
  onLoginClick,
  onRegisterClick,
}: {
  onLaunchApp: () => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
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
    { name: 'Discord', href: 'https://discord.gg/pqSwuGxrmh', external: true },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 animate-fade-in ${
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
                {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={`text-sm font-medium transition-colors ${
                  link.name === 'Discord'
                    ? 'text-[#5865F2] hover:text-[#4752C4] flex items-center gap-1.5'
                    : 'text-[var(--text-secondary)] hover:text-reed-red'
                }`}
              >
                {link.name === 'Discord' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                )}
                {link.name}
              </a>
            ))}
          </div>

          {/* CTA Buttons - Clean */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <button
                  onClick={onLaunchApp}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-reed-red text-white text-sm font-medium rounded-lg hover:bg-reed-red-dark transition-colors shadow-lg shadow-reed-red/25"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Open Dashboard
                </button>
                <button
                  onClick={signOut}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-reed-red text-white text-sm font-medium rounded-lg hover:bg-reed-red-dark transition-colors "
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
                {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block text-base font-medium ${
                  link.name === 'Discord'
                    ? 'text-[#5865F2] hover:text-[#4752C4] flex items-center gap-2'
                    : 'text-[var(--text-secondary)] hover:text-reed-red'
                }`}
              >
                {link.name === 'Discord' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                )}
                {link.name}
              </a>
            ))}

            {user ? (
              <>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onLaunchApp(); }}
                  className="block w-full text-center px-5 py-3 bg-reed-red text-white text-sm font-semibold rounded-lg"
                >
                  Open Dashboard
                </button>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); signOut(); }}
                  className="block w-full text-left text-base font-medium text-[var(--text-muted)] hover:text-reed-red py-2"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onLoginClick(); }}
                  className="block w-full text-left text-base font-medium text-[var(--text-secondary)] hover:text-reed-red py-2"
                >
                  Log In
                </button>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onRegisterClick(); }}
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

// Hero Section - GSAP-powered entrance animations
const HeroSection = ({ onLaunchApp, onViewServices }: { onLaunchApp: () => void; onViewServices: () => void }) => {
  const { images, isLoading } = usePortfolioImages({ category: 'sfw' });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [showNext, setShowNext] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  const heroImages = images.slice(0, 6);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      const next = (currentImageIndex + 1) % heroImages.length;
      setNextImageIndex(next);
      setActiveIndex(next);
      setShowNext(true);
      setTimeout(() => {
        setCurrentImageIndex(next);
        setShowNext(false);
      }, 700);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroImages.length, currentImageIndex]);

  const goToImage = (i: number) => {
    if (i === activeIndex) return;
    setNextImageIndex(i);
    setActiveIndex(i);
    setShowNext(true);
    setTimeout(() => {
      setCurrentImageIndex(i);
      setShowNext(false);
    }, 700);
  };

  // GSAP hero entrance timeline
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });

      tl.fromTo('.hero-title-line',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: 'power3.out' }
      )
      .fromTo('.hero-subtitle',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' },
        '-=0.35'
      )
      .fromTo('.hero-cta-btn',
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out' },
        '-=0.25'
      )
      .fromTo('.hero-stat',
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'power3.out' },
        '-=0.15'
      )
      .fromTo('.hero-image-wrapper',
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.9, ease: 'power2.out' },
        0.25
      )
      .fromTo('.hero-badge',
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' },
        '-=0.25'
      )
      .fromTo('.hero-thumbs',
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' },
        '-=0.15'
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
      <HeroBackground />

      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-14 lg:pt-24 lg:pb-16">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left - Text */}
          <div>
            <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-bold text-[var(--text-primary)] leading-[1.08] mb-6">
              <span className="hero-title-line block">Generate & Scale</span>
              <span className="hero-title-line block text-reed-red">Consistent AI Content</span>
            </h1>

            <p className="hero-subtitle text-base sm:text-lg text-[var(--text-secondary)] max-w-lg mb-10 leading-relaxed">
              On-site AI generator + custom LoRAs & workflows built for your character. Same style, every time — zero ComfyUI experience required.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-12">
              <button
                onClick={onLaunchApp}
                className="hero-cta-btn group px-8 py-4 bg-reed-red text-white font-semibold rounded-xl hover:bg-reed-red-dark transition-all shadow-lg shadow-reed-red/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-reed-red/30 text-base"
              >
                Start Generating
              </button>
              <a
                href="#services"
                onClick={(e) => { e.preventDefault(); onViewServices(); }}
                className="hero-cta-btn inline-flex items-center gap-2 px-8 py-4 border-2 border-[var(--border-color)] text-[var(--text-primary)] font-semibold rounded-xl hover:border-reed-red hover:text-reed-red transition-all text-base"
              >
                View Services
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="https://discord.gg/pqSwuGxrmh"
                target="_blank"
                rel="noopener noreferrer"
                className="hero-cta-btn inline-flex items-center gap-2 px-4 py-4 text-[#5865F2] hover:text-[#4752C4] font-medium transition-colors text-base"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
                Discord
              </a>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-10">
              <div className="hero-stat">
                <div className="text-3xl font-bold text-[var(--text-primary)]">100%</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">Consistent Results</div>
              </div>
              <div className="hero-stat">
                <div className="text-3xl font-bold text-[var(--text-primary)]">1-5</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">Days LoRA Delivery</div>
              </div>
              <div className="hero-stat">
                <div className="text-3xl font-bold text-[var(--text-primary)]">Zero</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">ComfyUI Experience</div>
              </div>
            </div>
          </div>

          {/* Right - Featured image showcase */}
          <div className="hero-image-wrapper flex justify-center lg:justify-end">
            <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
              {isLoading || heroImages.length === 0 ? (
                <div className="w-full h-full bg-[var(--bg-secondary)] animate-pulse" />
              ) : (
                <>
                  <img
                    src={optimizeImageForCarousel(heroImages[currentImageIndex])}
                    alt="AI generated content by REED"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <img
                    src={optimizeImageForCarousel(heroImages[nextImageIndex])}
                    alt=""
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                      showNext ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    {heroImages.slice(0, 6).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToImage(i)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          i === activeIndex
                            ? 'bg-white w-6'
                            : 'bg-white/40 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              <div className="hero-badge absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full">
                <div className="w-2 h-2 bg-reed-red rounded-full animate-pulse" />
                <span className="text-xs font-medium text-white/90">AI Generated</span>
              </div>
            </div>

            {heroImages.length > 1 && (
              <div className="hero-thumbs hidden sm:flex gap-1.5 mt-3 w-full">
                {heroImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => goToImage(i)}
                    className={`relative flex-1 min-w-0 aspect-square rounded-lg overflow-hidden transition-all duration-300 ${
                      i === activeIndex
                        ? 'ring-2 ring-reed-red ring-offset-1 ring-offset-[var(--bg-primary)] scale-105'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img
                      src={optimizeImageForCarousel(img)}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

// Trust Marquee Bar - Scrolling infinite bar (like Lummia's top bar)
const TrustMarquee = () => {
  const items = [
    { icon: <ScanLine className="w-3.5 h-3.5" />, text: 'SAME CHARACTER EVERY SHOT' },
    { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: 'ZERO EXPERIENCE NEEDED' },
    { icon: <Clock className="w-3.5 h-3.5" />, text: '1-5 DAY LORA DELIVERY' },
    { icon: <Box className="w-3.5 h-3.5" />, text: 'EVERYTHING READY TO USE' },
    { icon: <Fingerprint className="w-3.5 h-3.5" />, text: 'SDXL / FLUX / Z IMAGE TURBO' },
    { icon: <Eye className="w-3.5 h-3.5" />, text: 'SFW NOW — NSFW SOON' },
  ];

  return (
    <div className="relative bg-reed-red overflow-hidden py-2.5 z-30">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <div key={i} className="inline-flex items-center gap-2 mx-8 text-white/90 text-xs font-bold uppercase tracking-widest flex-shrink-0">
            {item.icon}
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Three Ways Section - CSS scroll-reveal animated cards
const ThreeWaysSection = ({ onLaunchApp, onViewServices }: { onLaunchApp: () => void; onViewServices: () => void }) => {
  const revealRef = useScrollReveal();

  const cards = [
    {
      tag: 'Do it yourself',
      title: 'AI Generator',
      description: 'Generate images directly on our website. Create your model, describe what you want, click generate. Zero software, zero experience needed.',
      icon: <Wand2 className="w-6 h-6" />,
      cta: 'Try Generator',
      ctaHref: '#pricing',
      onClick: onLaunchApp,
      iconBg: 'bg-[var(--bg-tertiary)]',
      iconColor: 'text-reed-red',
    },
    {
      tag: 'We train your AI model',
      title: 'Custom LoRAs',
      description: 'Send us your reference photos. We manually train a custom LoRA (SDXL, Flux, or Z Image Turbo) that generates your exact character. Ready to use in 1-5 days.',
      icon: <Fingerprint className="w-6 h-6" />,
      cta: 'See LoRA Plans',
      ctaHref: '#services',
      onClick: onViewServices,
      iconBg: 'bg-[var(--bg-tertiary)]',
      iconColor: 'text-reed-red',
    },
    {
      tag: 'Ready-made templates',
      title: 'ComfyUI Workflows',
      description: 'Pre-built generation workflows for ComfyUI. Download, load your LoRA, and start producing images immediately. Zero node experience required.',
      icon: <GitBranch className="w-6 h-6" />,
      cta: 'View Workflows',
      ctaHref: '#services',
      onClick: onViewServices,
      iconBg: 'bg-[var(--bg-tertiary)]',
      iconColor: 'text-reed-red',
    },
  ];

  return (
    <section className="py-24 lg:py-32 bg-[var(--bg-primary)] border-t border-[var(--border-color)] overflow-hidden">
      <div ref={revealRef} className="scroll-reveal max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-bold text-reed-red uppercase tracking-[0.2em] mb-4">3 Ways to Use REED</span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
            Pick How You Want to <span className="text-gradient">Create</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
            Generate images yourself, get a custom AI model trained on your character, or buy ready-made workflows. Everything is plug & play — zero experience required.
          </p>
          <p className="text-amber-500/70 text-sm mt-4 flex items-center justify-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Currently SFW only — NSFW coming soon
          </p>
        </div>

        {/* 3 Cards */}
        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {cards.map((card, i) => (
            <button
              key={card.title}
              onClick={card.onClick}
              className="scroll-reveal-child group relative text-left rounded-2xl transition-all duration-500 hover:-translate-y-2 focus:outline-none"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              {/* Gradient border on hover */}
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent opacity-100 group-hover:from-reed-red/30 group-hover:to-reed-red/5 transition-all duration-500" />

              {/* Card inner */}
              <div className="relative bg-[var(--bg-secondary)] rounded-2xl p-8 lg:p-9 h-full flex flex-col">
                {/* Icon */}
                <div className={`relative z-10 w-14 h-14 rounded-2xl ${card.iconBg} ${card.iconColor} flex items-center justify-center mb-7 border border-[var(--border-color)] group-hover:scale-105 transition-transform duration-300`}>
                  {card.icon}
                </div>

                {/* Tag */}
                <div className="relative z-10 text-xs font-bold text-reed-red uppercase tracking-[0.15em] mb-2">
                  {card.tag}
                </div>

                {/* Title */}
                <h3 className="relative z-10 font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="relative z-10 text-[var(--text-secondary)] text-sm leading-relaxed mb-8 flex-grow">
                  {card.description}
                </p>

                {/* CTA link */}
                <div className="relative z-10 flex items-center gap-2 text-reed-red text-sm font-semibold group-hover:gap-3 transition-all">
                  {card.cta}
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

// Portfolio Section with SFW/NSFW Toggle
const PortfolioSection = () => {
  const [category, setCategory] = useState<'sfw' | 'nsfw'>('sfw');
  const [showAgeWarning, setShowAgeWarning] = useState(false);
  const revealRef = useScrollReveal();

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
    <section id="portfolio" className="relative bg-[var(--bg-secondary)] pt-14 lg:pt-20 scroll-mt-20">
      {/* Section heading + toggle */}
      <div ref={revealRef} className="scroll-reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="text-center mb-6">
          <span className="inline-block text-sm font-semibold text-reed-red uppercase tracking-wider mb-3">Portfolio</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
            See What AI Can
            <span className="text-gradient"> Generate</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-base max-w-lg mx-auto">
            Every image below is AI-generated. Same character, different poses, different scenes — 100% consistent.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCategory('sfw')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-l-xl transition-all ${
              category === 'sfw'
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
            }`}
          >
            <Eye className="w-4 h-4" />
            SFW
          </button>
          <button
            onClick={handleNsfwClick}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-r-xl transition-all ${
              category === 'nsfw'
                ? 'bg-reed-red text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-reed-red border border-[var(--border-color)] hover:border-reed-red'
            }`}
          >
            <EyeOff className="w-4 h-4" />
            NSFW
          </button>
        </div>

        {category === 'nsfw' && (
          <p className="text-center text-xs text-[var(--text-muted)] mt-3">
            Viewing NSFW content. Must be 18+.
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
              <EyeOff className="w-8 h-8 text-reed-red" />
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

// Anatomy of a Model / Pipeline Section
const HowItWorksSection = () => {
  const revealRef = useScrollReveal();

  return (
    <section className="py-20 lg:py-28 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] overflow-hidden relative">
      <div ref={revealRef} className="scroll-reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 lg:mb-20">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-reed-red/10 text-reed-red mb-5 border border-reed-red/20 shadow-[0_0_30px_rgba(230,57,70,0.15)] transform rotate-3 hover:rotate-0 transition-all">
             <Fingerprint className="w-6 h-6" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-5 leading-tight">
            How The Magic <span className="text-gradient">Actually Works</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto leading-relaxed">
            No generic software, no AI wrappers. Real manual architecture built by experts so you don't have to lift a finger.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="scroll-reveal-child bg-[var(--bg-primary)] p-8 rounded-3xl border border-[var(--card-border)] shadow-lg relative overflow-hidden group hover:border-reed-red transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-reed-red/5 rounded-full blur-3xl group-hover:bg-reed-red/10 transition-colors" />
              <div className="w-12 h-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl flex items-center justify-center mb-6 text-[var(--text-primary)] group-hover:bg-reed-red group-hover:text-white transition-colors">
                <span className="font-display font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">You Send Photos</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Provide us with 40 to 150 photos. We manually analyze weight, proportions, skin texture, and features to avoid generic "AI faces".
              </p>
            </div>
            
            <div className="scroll-reveal-child bg-[var(--bg-primary)] p-8 rounded-3xl border border-[var(--card-border)] shadow-lg relative overflow-hidden group hover:border-reed-red transition-all duration-300 hover:-translate-y-1" style={{ transitionDelay: '0.15s' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-reed-red/5 rounded-full blur-3xl group-hover:bg-reed-red/10 transition-colors" />
              <div className="w-12 h-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl flex items-center justify-center mb-6 text-[var(--text-primary)] group-hover:bg-reed-red group-hover:text-white transition-colors">
                <span className="font-display font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">We Train (1-5 Days)</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Our team manually processes the dataset and trains an SDXL, Z Image Turbo, or Flux LoRA optimized for photorealism. Zero automated software involved.
              </p>
            </div>

            <div className="scroll-reveal-child bg-[var(--bg-primary)] p-8 rounded-3xl border border-[var(--card-border)] shadow-lg relative overflow-hidden group hover:border-reed-red transition-all duration-300 hover:-translate-y-1" style={{ transitionDelay: '0.3s' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-reed-red/5 rounded-full blur-3xl group-hover:bg-reed-red/10 transition-colors" />
              <div className="w-12 h-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl flex items-center justify-center mb-6 text-[var(--text-primary)] group-hover:bg-reed-red group-hover:text-white transition-colors">
                <span className="font-display font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Ready-To-Use Engine</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Receive your custom model alongside our exclusive ComfyUI Workflows. Plug it in and generate advanced results instantly — zero node experience required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Services Section
const ServicesSection = ({ onBuyService }: { onBuyService: (service: ServiceItem) => void }) => {
  const headerRef = useScrollReveal();
  const loraRef = useScrollReveal();
  const workflowRef = useScrollReveal();
  const packageRef = useScrollReveal();

  return (
    <section id="services" className="pt-20 pb-24 lg:pt-28 lg:pb-32 bg-[var(--bg-primary)] scroll-mt-20 border-t border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div ref={headerRef} className="scroll-reveal text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-reed-red/10 rounded-full mb-5 border border-reed-red/20">
            <GitBranch className="w-4 h-4 text-reed-red" />
            <span className="text-sm font-semibold text-reed-red">For ComfyUI Users</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
            LoRAs & <span className="text-gradient">Workflows</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            One-time purchases. We build everything by hand — you just plug it into ComfyUI and start generating. Every product comes fully ready to use, even if you've never opened ComfyUI before.
          </p>
        </div>

        {/* ── Custom LoRAs ────────────────────────────────────────────── */}
        <div className="mb-20">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h3 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-reed-red" />
              Custom LoRA Training
            </h3>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-reed-red/10 border border-reed-red/30 rounded-full text-xs font-semibold text-reed-red">
              <span className="w-1.5 h-1.5 bg-reed-red rounded-full animate-pulse" />
              Launch Sale
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-8 max-w-2xl">
            We manually train a LoRA on your character — no automated software. You choose the base model: SDXL, Flux, or Z Image Turbo. Delivered in 1 to 5 days, ready to load into ComfyUI and start generating immediately.
          </p>

          <div ref={loraRef} className="scroll-reveal grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {LORAS.map((lora, i) => (
              <div key={lora.id} className={`scroll-reveal-child relative bg-[var(--card-bg)] rounded-2xl border-2 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col overflow-hidden ${
                lora.popular ? 'border-reed-red shadow-lg shadow-reed-red/10' : 'border-[var(--card-border)] hover:border-reed-red/50'
              }`}>
                {lora.popular && (
                  <div className="bg-reed-red text-white text-center py-2 text-xs font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <div className="p-7 flex flex-col flex-grow">
                  <h4 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">{lora.name}</h4>
                  <p className="text-[var(--text-secondary)] text-sm mb-5 flex-grow leading-relaxed">{lora.description}</p>

                  {lora.originalPrice && (
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm text-[var(--text-muted)] line-through">{lora.originalPrice}</span>
                      <span className="px-2 py-0.5 bg-reed-red text-white text-xs font-bold rounded">
                        SAVE {lora.discountPercent?.replace(' OFF', '')}
                      </span>
                    </div>
                  )}
                  <div className="text-4xl font-bold text-[var(--text-primary)] mb-5">{lora.price}</div>

                  <ul className="space-y-2.5 mb-7">
                    {lora.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                        <Check className="w-4 h-4 text-reed-red flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => onBuyService(lora)}
                    className="w-full py-3.5 font-semibold rounded-xl bg-reed-red text-white hover:bg-reed-red-dark transition-all shadow-lg shadow-reed-red/20 mt-auto"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ComfyUI Workflows ───────────────────────────────────────── */}
        <div className="mb-20">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h3 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
              <GitBranch className="w-5 h-5 text-reed-red" />
              ComfyUI Workflows
            </h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full text-xs font-semibold text-[var(--text-secondary)]">
              One-Time Purchase
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-reed-red/10 border border-reed-red/30 rounded-full text-xs font-semibold text-reed-red">
              <span className="w-1.5 h-1.5 bg-reed-red rounded-full animate-pulse" />
              Launch Sale
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-8 max-w-2xl">
            Hand-crafted by our team. Every workflow comes fully ready to use — just import it into ComfyUI, load your LoRA, and generate. No node knowledge required. These are advanced tools built so anyone can use them, regardless of experience.
          </p>

          <div ref={workflowRef} className="scroll-reveal grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {WORKFLOWS.map((wf, i) => (
              <div key={wf.id} className={`scroll-reveal-child relative bg-[var(--card-bg)] rounded-2xl border-2 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col overflow-hidden ${
                wf.popular ? 'border-reed-red shadow-lg shadow-reed-red/10 scale-[1.02] z-10' : 'border-[var(--card-border)] hover:border-reed-red/50'
              }`}>
                {wf.popular && (
                  <div className="bg-reed-red text-white text-center py-2 text-xs font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <div className="p-7 flex flex-col flex-grow">
                  <h4 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">{wf.name}</h4>
                  <p className="text-[var(--text-secondary)] text-sm mb-5 flex-grow leading-relaxed">{wf.description}</p>

                  {wf.originalPrice && (
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm text-[var(--text-muted)] line-through">{wf.originalPrice}</span>
                      <span className="px-2 py-0.5 bg-reed-red text-white text-xs font-bold rounded">
                        SAVE {wf.discountPercent?.replace(' OFF', '')}
                      </span>
                    </div>
                  )}
                  <div className="text-4xl font-bold text-[var(--text-primary)] mb-5">{wf.price}</div>

                  <ul className="space-y-2.5 mb-7">
                    {wf.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                        <Check className="w-4 h-4 text-reed-red flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => onBuyService(wf)}
                    className={`w-full py-3.5 font-semibold rounded-xl transition-all mt-auto ${
                      wf.popular
                        ? 'bg-reed-red text-white hover:bg-reed-red-dark shadow-lg shadow-reed-red/20'
                        : 'border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:border-reed-red hover:text-reed-red'
                    }`}
                  >
                    {wf.popular ? 'Get Started' : 'Buy Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Complete Packages ────────────────────────────────────────── */}
        <div>
          <h3 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-3 flex items-center gap-3">
            <Box className="w-5 h-5 text-reed-red" />
            Complete Packages
          </h3>
          <p className="text-[var(--text-secondary)] text-sm mb-8 max-w-2xl">
            LoRA + Workflows bundled together. Everything you need in one purchase.
          </p>
          <div ref={packageRef} className="scroll-reveal grid md:grid-cols-3 gap-6">
            {PACKAGES.map((pkg, i) => (
              <div key={pkg.id} className={`scroll-reveal-child relative bg-[var(--card-bg)] rounded-2xl p-6 border-2 transition-all flex flex-col ${
                pkg.popular ? 'border-reed-red' : 'border-[var(--card-border)]'
              }`}>
                {pkg.popular && (
                  <div className="absolute -top-3 left-6 px-3 py-1 bg-reed-red text-white text-xs font-bold rounded-full">
                    Recommended
                  </div>
                )}
                <h4 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">{pkg.name}</h4>
                <p className="text-[var(--text-secondary)] text-sm mb-5 flex-grow">{pkg.description}</p>
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-5">{pkg.price}</div>
                <ul className="space-y-2.5 mb-6">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-reed-red flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled
                  className="w-full py-3 font-semibold rounded-xl border-2 border-[var(--border-color)] text-[var(--text-muted)] cursor-not-allowed opacity-50 mt-auto"
                >
                  Coming Soon
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
  const headerRevealRef = useScrollReveal();
  const cardsRevealRef = useScrollReveal();

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
        "Single pose per generation",
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
        "Single pose per generation",
        "Custom instructions"
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
        "Up to 4K resolution",
        "Pose Variation included",
        "Full creative control"
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
        "Pose Variation included",
        "Priority support"
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
        "Pose Variation included",
        "1:1 call support"
      ],
      cta: "Choose Studio",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="pt-24 pb-28 lg:pt-32 lg:pb-36 bg-[var(--bg-primary)] scroll-mt-20 border-t border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div ref={headerRevealRef} className="scroll-reveal text-center mb-16">
          <span className="inline-block text-sm font-bold text-reed-red uppercase tracking-[0.2em] mb-4">Web Generator Plans</span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
            Choose Your <span className="text-gradient">Plan</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
            Get credits and generate directly on our website. No software needed.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
              <Shield className="w-3.5 h-3.5" />
              14-day guarantee
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-full text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              SFW only — NSFW soon
            </div>
          </div>
        </div>

        {/* All 5 plans in unified grid */}
        <div ref={cardsRevealRef} className="scroll-reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-3 items-start">
          {plans.map((plan, idx) => {
            const isPopular = plan.popular;
            const isCurrent = user?.plan_type === plan.id;
            const costPerCredit = plan.creditsValue > 0 && plan.priceValue > 0
              ? (plan.priceValue / plan.creditsValue).toFixed(2)
              : null;

            return (
              <div key={plan.id} className="scroll-reveal-child relative group" style={{ transitionDelay: `${idx * 0.06}s` }}>
                {/* Gradient glow behind popular card */}
                {isPopular && (
                  <div className="absolute -inset-[2px] rounded-[22px] bg-gradient-to-b from-reed-red via-reed-red/50 to-reed-red/20 opacity-100 blur-[1px]" />
                )}

                <div className={`relative flex flex-col h-full rounded-[20px] transition-all duration-300 ${
                  isPopular
                    ? 'bg-[var(--card-bg)] shadow-2xl shadow-reed-red/10 lg:-translate-y-4'
                    : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-white/10'
                }`}>
                  {/* Popular badge */}
                  {isPopular && (
                    <div className="bg-reed-red text-white text-center py-2.5 rounded-t-[20px] text-[11px] font-bold uppercase tracking-[0.15em]">
                      Most Popular
                    </div>
                  )}

                  <div className={`flex flex-col flex-grow ${isPopular ? 'p-6 lg:p-7' : 'p-6'}`}>
                    {/* Plan name */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-display font-bold text-[var(--text-primary)] ${isPopular ? 'text-xl' : 'text-lg'}`}>
                        {plan.name}
                      </h3>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-reed-red/10 text-reed-red">
                          Current
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mb-1">
                      <span className={`font-bold text-[var(--text-primary)] ${isPopular ? 'text-5xl' : 'text-4xl'}`}>{plan.price}</span>
                      <span className="text-[var(--text-muted)] text-sm ml-1">/mo</span>
                    </div>

                    {/* Cost per credit */}
                    {costPerCredit && (
                      <div className="text-xs text-[var(--text-muted)] mb-5">${costPerCredit}/credit</div>
                    )}
                    {!costPerCredit && <div className="text-xs text-[var(--text-muted)] mb-5">Free forever</div>}

                    {/* Credits highlight */}
                    <div className={`flex items-center gap-2.5 p-3 rounded-xl mb-5 ${
                      isPopular ? 'bg-reed-red/10 border border-reed-red/20' : 'bg-[var(--bg-primary)] border border-[var(--border-color)]'
                    }`}>
                      <Zap className={`w-4 h-4 flex-shrink-0 ${isPopular ? 'text-reed-red' : 'text-[var(--text-muted)]'}`} />
                      <span className={`text-sm font-semibold ${isPopular ? 'text-reed-red' : 'text-[var(--text-primary)]'}`}>
                        {plan.credits} credits/month
                      </span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 mb-6 flex-grow">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                          <Check className="w-3.5 h-3.5 text-reed-red flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isCurrent}
                      className={`w-full py-3 text-sm font-semibold rounded-xl transition-all mt-auto ${
                        isCurrent
                          ? 'bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-default'
                          : isPopular
                            ? 'bg-reed-red text-white hover:bg-reed-red-dark shadow-lg shadow-reed-red/25'
                            : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-reed-red hover:text-reed-red'
                      }`}
                    >
                      {isCurrent ? 'Current Plan' : plan.cta}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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

// FAQ Section - CSS reveal + simple toggle
const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const revealRef = useScrollReveal();

  const faqs = [
    {
      question: "Do I need ComfyUI to use REED?",
      answer: "No. We have two options: (1) Use our Web Generator — subscribe, get credits, and generate directly on our website with zero software. (2) Buy LoRAs and Workflows to run on your own ComfyUI setup."
    },
    {
      question: "What base models can I choose for my LoRA?",
      answer: "You choose: SDXL, Flux, or Z Image Turbo. We manually train the LoRA on the base model you prefer. Delivery in 1 to 5 days."
    },
    {
      question: "What are ComfyUI Workflows?",
      answer: "Ready-to-use templates for ComfyUI. Import the file, load your LoRA, and generate. You don't need to know anything about nodes or ComfyUI — everything comes pre-built."
    },
    {
      question: "Are LoRAs auto-generated?",
      answer: "No. Every LoRA is manually trained and tested by our team. No automated scripts or generic wrappers."
    },
    {
      question: "What's the difference between the Web Generator and buying a LoRA?",
      answer: "The Web Generator runs on our website — you create a model with your reference photos, then generate images using credits. No software needed. A custom LoRA is a file we train for you to use in ComfyUI on your own machine, giving you full control. Both are ready to use with zero experience."
    },
    {
      question: "Is NSFW content available?",
      answer: "Not yet. Currently all generation is SFW only. NSFW generation is coming soon — join our Discord to stay updated on the release."
    },
    {
      question: "Do I need technical skills to use your workflows?",
      answer: "No. Every workflow and LoRA we sell comes fully ready to use. You just import the file into ComfyUI, load the LoRA, and hit generate. We built everything so that even someone who has never opened ComfyUI can get professional results."
    }
  ];

  return (
    <section id="faq" className="pt-16 pb-24 lg:pt-20 lg:pb-32 bg-[var(--bg-primary)] scroll-mt-20">
      <div ref={revealRef} className="scroll-reveal max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-reed-red uppercase tracking-wider mb-4">Got Questions?</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
            Frequently Asked
            <span className="text-gradient"> Questions</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)]">
            Everything you need to know before getting started with REED.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="scroll-reveal-child bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden"
              style={{ transitionDelay: `${index * 0.05}s` }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-[var(--hover-bg)] transition-colors"
              >
                <span className="font-semibold text-[var(--text-primary)] pr-4">{faq.question}</span>
                <div className={`transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}>
                  <ChevronDown className={`w-5 h-5 flex-shrink-0 ${openIndex === index ? 'text-reed-red' : 'text-[var(--text-muted)]'}`} />
                </div>
              </button>
              <div className={`faq-answer-wrap ${openIndex === index ? 'faq-open' : ''}`}>
                <div className="px-6 pb-6">
                  <p className="text-[var(--text-secondary)] leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// CTA Section
const CTASection = () => {
  const revealRef = useScrollReveal();

  return (
    <section className="py-24 bg-reed-red relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-black/10 rounded-full blur-3xl" />

      <div ref={revealRef} className="scroll-reveal relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Ready to Start?
        </h2>
        <p className="text-lg text-white/80 mb-4 max-w-2xl mx-auto">
          Generate on our website or buy LoRAs & Workflows for ComfyUI.
          Everything is ready to use with zero experience required.
        </p>
        <p className="text-sm text-white/50 mb-10">SFW generation available now — NSFW coming soon</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#pricing"
            className="scroll-reveal-child inline-flex items-center gap-2 px-8 py-4 bg-white text-reed-red font-semibold rounded-xl hover:bg-gray-100 hover:shadow-xl transition-all hover:-translate-y-0.5 shadow-lg"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </a>
          <a
            href="#services"
            className="scroll-reveal-child inline-flex items-center gap-2 px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-xl hover:border-white hover:bg-white/10 transition-all hover:-translate-y-0.5"
            style={{ transitionDelay: '0.1s' }}
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
  const revealRef = useScrollReveal();

  return (
    <footer className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] py-16">
      <div ref={revealRef} className="scroll-reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <a href="https://discord.gg/pqSwuGxrmh" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[#5865F2] transition-colors">
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
    return <DashboardLayout onBackToLanding={handleShowLanding} />;
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
      />

      {showLogin && (
        <LoginPage
          onClose={() => setShowLogin(false)}
          onSwitch={() => { setShowLogin(false); setShowRegister(true); }}
          onSuccess={() => {
            setShowLogin(false);
            setShowApp(true);
            localStorage.setItem('reed_show_app', 'true');
          }}
        />
      )}

      {showRegister && (
        <RegisterPage
          onClose={() => setShowRegister(false)}
          onSwitch={() => { setShowRegister(false); setShowLogin(true); }}
        />
      )}

      {/* 1. Hero */}
      <HeroSection
        onLaunchApp={handleShowApp}
        onViewServices={() => {
          document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 2. Trust marquee bar */}
      <TrustMarquee />

      {/* 3. Real Creator Results */}
      <RevenueShowcase />

      {/* 4. Portfolio */}
      <PortfolioSection />

      {/* 5. Three Ways to Create */}
      <ThreeWaysSection
        onLaunchApp={handleShowApp}
        onViewServices={() => {
          document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 6. Web Generator Pricing (subscriptions) */}
      <PricingSection onLoginClick={() => setShowLogin(true)} />

      {/* 7. LoRAs & Workflows Store */}
      <ServicesSection onBuyService={handleBuyService} />

      {/* 9. FAQ */}
      <FAQSection />

      {/* 10. Final CTA */}
      <CTASection />

      {/* 11. Footer */}
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
            setShowApp(true);
            localStorage.setItem('reed_show_app', 'true');
          }}
          onGoToPurchases={() => {
            setShowThankYou(false);
            setSelectedServiceForPayment(null);
            setShowApp(true);
            localStorage.setItem('reed_show_app', 'true');
          }}
        />
      )}
    </div>
  );
};

export default LandingPage;
