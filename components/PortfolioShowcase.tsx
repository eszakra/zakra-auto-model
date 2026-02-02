import React, { useState } from 'react';
import { usePortfolioImages } from '../hooks/usePortfolioImages';
import { optimizeImageForCarousel } from '../utils/imageOptimizer';

interface PortfolioShowcaseProps {
  className?: string;
  category?: 'sfw' | 'nsfw';
}

export const PortfolioShowcase: React.FC<PortfolioShowcaseProps> = ({
  className = '',
  category = 'sfw'
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const { images, isLoading } = usePortfolioImages({ category });

  // Si no hay imágenes o está cargando, no mostrar nada
  if (isLoading) {
    return (
      <section className={`relative py-16 overflow-hidden bg-[var(--bg-secondary)] ${className}`}>
        <div className="flex items-center justify-center h-[320px]">
          <div className="animate-pulse text-[var(--text-muted)]">Loading portfolio...</div>
        </div>
      </section>
    );
  }

  if (images.length === 0) {
    return null;
  }

  // Duplicar imágenes para efecto infinito
  const allImages = [...images, ...images, ...images];

  // Dividir en dos filas
  const row1 = allImages.slice(0, allImages.length / 2);
  const row2 = allImages.slice(allImages.length / 2);

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
            {row1.map((image, index) => (
              <div
                key={`row1-${index}`}
                className="relative flex-shrink-0 w-[260px] h-[320px] rounded-2xl overflow-hidden group"
              >
                <img
                  src={optimizeImageForCarousel(image)}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
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
            {row2.map((image, index) => (
              <div
                key={`row2-${index}`}
                className="relative flex-shrink-0 w-[260px] h-[320px] rounded-2xl overflow-hidden group"
              >
                <img
                  src={optimizeImageForCarousel(image)}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
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
