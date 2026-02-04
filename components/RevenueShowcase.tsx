import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowRight, ImageIcon } from 'lucide-react';
import { fetchRevenueResults, RevenueResult } from '../services/airtableService';

interface RevenueShowcaseProps {
  className?: string;
}

export const RevenueShowcase: React.FC<RevenueShowcaseProps> = ({
  className = ''
}) => {
  const [results, setResults] = useState<RevenueResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      const data = await fetchRevenueResults();
      setResults(data);
      setLoading(false);
    };
    loadResults();
  }, []);

  const hasResults = results.length > 0;

  // Placeholder cards for coming soon state
  const PLACEHOLDER_CARDS = [
    { id: 1, delay: '0s' },
    { id: 2, delay: '0.5s' },
    { id: 3, delay: '1s' },
    { id: 4, delay: '1.5s' },
    { id: 5, delay: '0.3s' },
    { id: 6, delay: '0.8s' },
  ];

  return (
    <section
      id="results"
      className={`relative py-16 lg:py-20 overflow-hidden bg-[var(--bg-primary)] ${className}`}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Subtle red ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-reed-red/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full mb-4">
            <TrendingUp className="w-4 h-4 text-reed-red" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {hasResults ? 'Real Results' : 'Coming Soon'}
            </span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-3">
            Real Creator
            <span className="text-gradient"> Results</span>
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
            {hasResults
              ? 'Revenue screenshots from creators using our AI models. Join them and multiply your earnings.'
              : 'Revenue screenshots from creators using our AI models will be showcased here. Be one of the first to share your success story.'}
          </p>
        </div>

        {/* Results Grid or Placeholder */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-2 border-reed-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hasResults ? (
          /* Static horizontal layout - images protected */
          <div
            className="relative flex justify-center items-center gap-3 sm:gap-4 lg:gap-5 mb-8 px-4"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            {results.map((result) => (
              <div
                key={result.id}
                className="relative group"
              >
                {/* Image container */}
                <div className="relative h-[160px] sm:h-[200px] lg:h-[260px] rounded-xl overflow-hidden border border-white/10 bg-[var(--bg-secondary)] shadow-lg shadow-black/40 select-none transition-transform duration-300 ease-out group-hover:scale-105">
                  <img
                    src={result.imageUrl}
                    alt=""
                    className="h-full w-auto object-contain pointer-events-none select-none"
                    loading="lazy"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
                  />
                  {/* Invisible overlay to block interactions */}
                  <div className="absolute inset-0" onContextMenu={(e) => e.preventDefault()} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Placeholder Grid */
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 mb-14 max-w-3xl mx-auto">
            {PLACEHOLDER_CARDS.map((card) => (
              <div
                key={card.id}
                className="group relative"
                style={{
                  animation: `float 6s ease-in-out infinite`,
                  animationDelay: card.delay,
                }}
              >
                <div className="aspect-[9/16] rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-primary)] transition-all duration-500 group-hover:border-reed-red/40 group-hover:shadow-lg group-hover:shadow-reed-red/10">
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center mb-2 group-hover:bg-reed-red/10 group-hover:border-reed-red/30 transition-all duration-500">
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-muted)] group-hover:text-reed-red/60 transition-colors duration-500" />
                    </div>
                    <span className="text-[8px] sm:text-[10px] text-[var(--text-muted)] text-center leading-tight">
                      Revenue
                      <br />
                      Screenshot
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <p className="text-[var(--text-secondary)] text-sm sm:text-base mb-5">
            {hasResults ? 'Ready to join successful creators?' : 'Start creating and be featured here'}
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-reed-red text-white text-sm font-semibold rounded-xl hover:bg-reed-red-dark transition-colors shadow-lg shadow-reed-red/20"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>


      {/* CSS for placeholder animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </section>
  );
};

export default RevenueShowcase;
