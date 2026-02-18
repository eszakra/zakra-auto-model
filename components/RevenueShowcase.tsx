import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowRight, ImageIcon } from 'lucide-react';
import { fetchRevenueResults, RevenueResult } from '../services/airtableService';

interface RevenueShowcaseProps {
  className?: string;
}

/* ── single screenshot card ── */
const ScreenshotCard = ({
  result,
  isActive,
  onEnter,
  onLeave,
}: {
  result: RevenueResult;
  isActive: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) => (
  <div
    className="group relative w-full h-full rounded-xl overflow-hidden select-none"
    onMouseEnter={onEnter}
    onMouseLeave={onLeave}
  >
    <div
      className={`relative w-full h-full overflow-hidden rounded-xl border transition-all duration-400 ${isActive
          ? 'border-reed-red/30 shadow-xl shadow-reed-red/8'
          : 'border-white/[0.06]'
        }`}
    >
      <img
        src={result.imageUrl}
        alt=""
        className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-700 group-hover:scale-[1.03]"
        loading="lazy"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
      />

      {/* hover gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition-opacity duration-400 ${isActive ? 'opacity-100' : 'opacity-0'
          }`}
      />

      {/* blocker */}
      <div className="absolute inset-0" onContextMenu={(e) => e.preventDefault()} />

      {/* verified pill */}
      <div
        className={`absolute bottom-2.5 left-2.5 transition-all duration-400 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/15">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          <span className="text-[10px] font-medium text-white/90">Verified</span>
        </div>
      </div>
    </div>
  </div>
);

export const RevenueShowcase: React.FC<RevenueShowcaseProps> = ({
  className = '',
}) => {
  const [results, setResults] = useState<RevenueResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
  const items = results.slice(0, 8);

  return (
    <section
      id="results"
      className={`relative py-16 lg:py-20 overflow-hidden bg-[var(--bg-primary)] ${className}`}
    >
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── header ── */}
        <div className="text-center mb-10 lg:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-reed-red/8 border border-reed-red/15 rounded-full mb-5">
            <TrendingUp className="w-3.5 h-3.5 text-reed-red" />
            <span className="text-xs font-semibold text-reed-red uppercase tracking-wider">
              {hasResults ? 'Real Results' : 'Coming Soon'}
            </span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-3">
            Creators Are
            <span className="text-gradient"> Making Money</span>
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-md mx-auto">
            {hasResults
              ? 'Real revenue screenshots from creators using REED AI models.'
              : 'Revenue screenshots from creators will be showcased here.'}
          </p>
        </div>

        {/* ── grid ── */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-2 border-reed-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hasResults ? (
          <div
            className="columns-1 md:columns-2 lg:columns-3 gap-4 mb-10 mx-auto"
            onContextMenu={(e) => e.preventDefault()}
          >
            {items.map((result, index) => (
              <div key={result.id} className="break-inside-avoid mb-4">
                <ScreenshotCard
                  result={result}
                  isActive={activeIndex === index}
                  onEnter={() => setActiveIndex(index)}
                  onLeave={() => setActiveIndex(null)}
                />
              </div>
            ))}
          </div>
        ) : (
          /* placeholder */
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 mb-10 mx-auto">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid mb-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center aspect-[3/4] sm:aspect-auto"
                style={{ height: [200, 300, 250, 350, 280, 220, 310, 260, 290][i % 9] + 'px' }}
              >
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                  <span className="text-xs text-[var(--text-muted)] font-medium">Coming Soon</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── cta ── */}
        <div className="text-center">
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-reed-red text-white text-sm font-semibold rounded-xl hover:bg-reed-red-dark transition-all shadow-lg shadow-reed-red/20 hover:-translate-y-0.5"
          >
            Start Generating
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default RevenueShowcase;
