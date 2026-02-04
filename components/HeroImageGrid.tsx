import React, { useState, useEffect, useCallback } from 'react';

interface HeroImageGridProps {
  className?: string;
}

const placeholderImages = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800&h=1000&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=1000&fit=crop&q=80',
];

export const HeroImageGrid: React.FC<HeroImageGridProps> = ({ className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % placeholderImages.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Fondo del tema */}
      <div className="absolute inset-0 bg-[var(--bg-primary)]" />

      {/* Imagen de fondo con transición suave */}
      <div className="absolute inset-0">
        {placeholderImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Overlay oscuro consistente */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Gradiente para integración con el tema */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom, var(--bg-primary) 0%, transparent 20%, transparent 80%, var(--bg-primary) 100%),
            linear-gradient(to right, var(--bg-primary) 0%, transparent 15%, transparent 85%, var(--bg-primary) 100%)
          `
        }}
      />

      {/* Indicadores */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
        {placeholderImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-white w-8' 
                : 'bg-white/40 w-4 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroImageGrid;
