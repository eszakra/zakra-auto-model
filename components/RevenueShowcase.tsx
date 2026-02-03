import React from 'react';
import { TrendingUp, ArrowRight, ImageIcon } from 'lucide-react';

interface RevenueShowcaseProps {
  className?: string;
}

// Placeholder cards - will be replaced with real screenshots later
const PLACEHOLDER_CARDS = [
  { id: 1, delay: '0s' },
  { id: 2, delay: '0.5s' },
  { id: 3, delay: '1s' },
  { id: 4, delay: '1.5s' },
  { id: 5, delay: '0.3s' },
  { id: 6, delay: '0.8s' },
];

export const RevenueShowcase: React.FC<RevenueShowcaseProps> = ({
  className = ''
}) => {
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

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full mb-6">
            <TrendingUp className="w-4 h-4 text-reed-red" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">Coming Soon</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4">
            Real Creator
            <span className="text-gradient"> Results</span>
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
            Revenue screenshots from creators using our AI models will be showcased here.
            Be one of the first to share your success story.
          </p>
        </div>

        {/* Floating Grid */}
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
                {/* Placeholder content */}
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

        {/* CTA */}
        <div className="text-center">
          <p className="text-[var(--text-secondary)] text-sm sm:text-base mb-5">
            Start creating and be featured here
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

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </section>
  );
};

export default RevenueShowcase;
