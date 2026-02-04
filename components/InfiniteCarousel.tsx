import React, { useRef, useEffect, useState } from 'react';

interface InfiniteCarouselProps {
  className?: string;
}

const portfolioImages = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=400&h=500&fit=crop&q=80',
];

// Skeleton card component
const SkeletonCard: React.FC = () => (
  <div className="relative flex-shrink-0 w-[280px] h-[350px] rounded-2xl overflow-hidden bg-white/5">
    <div className="absolute inset-0 skeleton-shimmer" />
  </div>
);

export const InfiniteCarousel: React.FC<InfiniteCarouselProps> = ({ className = '' }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const minImagesToShow = 6; // Mostrar carrusel cuando al menos 6 imágenes estén cargadas

  // Duplicar imágenes para efecto infinito
  const allImages = [...portfolioImages, ...portfolioImages, ...portfolioImages];

  // Precargar las primeras imágenes
  useEffect(() => {
    const imagesToPreload = portfolioImages.slice(0, minImagesToShow);
    let loaded = 0;

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded >= minImagesToShow) {
          setIsLoading(false);
        }
      };
      img.onerror = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded >= minImagesToShow) {
          setIsLoading(false);
        }
      };
      img.src = src;
    });
  }, []);

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className={`relative w-full overflow-hidden ${className}`}>
        {/* Skeleton container - centrado */}
        <div className="flex gap-4 justify-center items-center">
          {Array.from({ length: 7 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>

        {/* Gradientes laterales */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[var(--bg-primary)] to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[var(--bg-primary)] to-transparent pointer-events-none z-10" />

        <style>{`
          .skeleton-shimmer {
            background: linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.03) 0%,
              rgba(255, 255, 255, 0.08) 50%,
              rgba(255, 255, 255, 0.03) 100%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s ease-in-out infinite;
          }

          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Contenedor del carrusel */}
      <div
        className="flex gap-4 carousel-animate"
        style={{
          animationPlayState: isPaused ? 'paused' : 'running',
          width: 'fit-content',
        }}
      >
        {allImages.map((image, index) => (
          <div
            key={index}
            className="relative flex-shrink-0 w-[280px] h-[350px] rounded-2xl overflow-hidden group bg-white/5"
          >
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Overlay sutil */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>

      {/* Gradientes laterales */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[var(--bg-primary)] to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[var(--bg-primary)] to-transparent pointer-events-none z-10" />

      <style>{`
        .carousel-animate {
          animation: scrollLeft 40s linear infinite;
        }

        @keyframes scrollLeft {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.33%);
          }
        }
      `}</style>
    </div>
  );
};

export default InfiniteCarousel;
