import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, ArrowRight, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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
    className="group relative flex-shrink-0 w-[220px] sm:w-[240px] select-none"
    onMouseEnter={onEnter}
    onMouseLeave={onLeave}
  >
    <div
      className={`relative w-full h-[360px] overflow-hidden rounded-2xl border transition-all duration-300 ${isActive
          ? 'border-reed-red/30'
          : 'border-[var(--border-color)]'
        }`}
    >
      <img
        src={result.imageUrl}
        alt=""
        className="w-full h-full object-cover object-top pointer-events-none select-none"
        loading="lazy"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
      />

      {/* blocker */}
      <div className="absolute inset-0" onContextMenu={(e) => e.preventDefault()} />

      {/* verified pill */}
      <div
        className={`absolute bottom-3 left-3 transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const items = results.slice(0, 10);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 256;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <section
      id="results"
      className={`relative py-16 lg:py-20 overflow-hidden bg-[var(--bg-primary)] ${className}`}
    >
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8 lg:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-reed-red/8 border border-reed-red/15 rounded-full mb-4">
              <TrendingUp className="w-3.5 h-3.5 text-reed-red" />
              <span className="text-xs font-semibold text-reed-red uppercase tracking-wider">
                {hasResults ? 'Real Results' : 'Coming Soon'}
              </span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
              Creators Are
              <span className="text-gradient"> Making Money</span>
            </h2>
            <p className="text-sm text-[var(--text-secondary)] max-w-md">
              {hasResults
                ? 'Real earnings from creators who use our tools to scale their content.'
                : 'Revenue screenshots from creators will be showcased here.'}
            </p>
          </div>

          {/* Navigation arrows */}
          {hasResults && items.length > 3 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="w-10 h-10 rounded-full border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-reed-red transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-10 h-10 rounded-full border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-reed-red transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── horizontal scroll gallery ── */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-2 border-reed-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hasResults ? (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {items.map((result, index) => (
              <ScreenshotCard
                key={result.id}
                result={result}
                isActive={activeIndex === index}
                onEnter={() => setActiveIndex(index)}
                onLeave={() => setActiveIndex(null)}
              />
            ))}
          </div>
        ) : (
          /* placeholder */
          <div className="flex gap-4 overflow-hidden pb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[220px] h-[360px] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center"
              >
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                  <span className="text-xs text-[var(--text-muted)] font-medium">Coming Soon</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default RevenueShowcase;
