import React, { useState, useEffect, useMemo } from 'react';
import { usePortfolioImages } from '../hooks/usePortfolioImages';
import { optimizeImageForCarousel, optimizeImageForCarouselFast } from '../utils/imageOptimizer';

interface PortfolioShowcaseProps {
  className?: string;
  category?: 'sfw' | 'nsfw';
}

// Preload first N images for instant display
const PRELOAD_COUNT = 6;

export const PortfolioShowcase: React.FC<PortfolioShowcaseProps> = ({
  className = '',
  category = 'sfw'
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const { images, isLoading } = usePortfolioImages({ category });

  // Preload first images for faster initial render
  useEffect(() => {
    if (images.length === 0) return;

    const imagesToPreload = images.slice(0, PRELOAD_COUNT);
    let loadedCount = 0;

    const preloadImage = (url: string) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount >= imagesToPreload.length) {
          setImagesReady(true);
        }
      };
      img.src = optimizeImageForCarouselFast(url);
    };

    imagesToPreload.forEach(preloadImage);

    // Fallback: show after 2s even if not all loaded
    const timeout = setTimeout(() => setImagesReady(true), 2000);
    return () => clearTimeout(timeout);
  }, [images]);

  // Memoize image arrays to prevent unnecessary recalculations
  const { row1Images, row2Images } = useMemo(() => {
    if (images.length === 0) return { row1Images: [], row2Images: [] };

    const midPoint = Math.ceil(images.length / 2);
    const firstHalf = images.slice(0, midPoint);
    const secondHalf = images.slice(midPoint);

    return {
      row1Images: [...firstHalf, ...firstHalf, ...firstHalf],
      row2Images: [...secondHalf, ...secondHalf, ...secondHalf],
    };
  }, [images]);

  // Show skeleton while loading
  if (isLoading || (images.length > 0 && !imagesReady)) {
    return (
      <section className={`relative py-16 overflow-hidden bg-[var(--bg-secondary)] ${className}`}>
        <div className="space-y-4">
          {/* Skeleton row 1 */}
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[260px] h-[320px] rounded-2xl bg-[var(--bg-tertiary)] animate-pulse" />
            ))}
          </div>
          {/* Skeleton row 2 */}
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[260px] h-[320px] rounded-2xl bg-[var(--bg-tertiary)] animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <section className={`relative py-16 overflow-hidden bg-[var(--bg-secondary)] ${className}`}>
      {/* Carrusel doble fila */}
      <div
        className="space-y-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Fila 1 - Izquierda a derecha */}
        <div className="relative overflow-hidden">
          <div
            className="flex gap-4"
            style={{
              animation: `scrollLeft 50s linear infinite`,
              animationPlayState: isPaused ? 'paused' : 'running',
              width: 'fit-content',
            }}
          >
            {row1Images.map((image, index) => (
              <div
                key={`row1-${index}`}
                className="relative flex-shrink-0 w-[260px] h-[320px] rounded-2xl overflow-hidden group"
              >
                <img
                  src={optimizeImageForCarousel(image)}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading={index < 6 ? 'eager' : 'lazy'}
                  decoding={index < 6 ? 'sync' : 'async'}
                  fetchPriority={index < 3 ? 'high' : 'auto'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Fila 2 - Derecha a izquierda */}
        <div className="relative overflow-hidden">
          <div
            className="flex gap-4"
            style={{
              animation: `scrollRight 50s linear infinite`,
              animationPlayState: isPaused ? 'paused' : 'running',
              width: 'fit-content',
            }}
          >
            {row2Images.map((image, index) => (
              <div
                key={`row2-${index}`}
                className="relative flex-shrink-0 w-[260px] h-[320px] rounded-2xl overflow-hidden group"
              >
                <img
                  src={optimizeImageForCarousel(image)}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading={index < 6 ? 'eager' : 'lazy'}
                  decoding={index < 6 ? 'sync' : 'async'}
                  fetchPriority={index < 3 ? 'high' : 'auto'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gradientes laterales */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--bg-secondary)] to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[var(--bg-secondary)] to-transparent pointer-events-none z-10" />

      <style>{`
        @keyframes scrollLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        @keyframes scrollRight {
          0% { transform: translateX(-33.33%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
};

export default PortfolioShowcase;
