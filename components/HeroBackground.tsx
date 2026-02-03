import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface HeroBackgroundProps {
  className?: string;
}

export const HeroBackground: React.FC<HeroBackgroundProps> = ({ className = '' }) => {
  const glowRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Glow breathing
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        scale: 1.05,
        opacity: 0.12,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    // Grid subtle movement
    if (gridRef.current) {
      gsap.to(gridRef.current, {
        y: -5,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    return () => {
      [glowRef, gridRef].forEach(ref => {
        if (ref.current) gsap.killTweensOf(ref.current);
      });
    };
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Base */}
      <div className="absolute inset-0 bg-[var(--bg-primary)]" />

      {/* Perspective Grid */}
      <div
        ref={gridRef}
        className="absolute bottom-0 left-0 right-0 h-[60%]"
        style={{
          perspective: '600px',
          perspectiveOrigin: '50% 0%',
        }}
      >
        <div
          className="absolute inset-0 origin-top"
          style={{
            transform: 'rotateX(50deg)',
            background: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 99px,
                rgba(220, 38, 38, 0.12) 99px,
                rgba(220, 38, 38, 0.12) 100px
              ),
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 99px,
                rgba(220, 38, 38, 0.12) 99px,
                rgba(220, 38, 38, 0.12) 100px
              )
            `,
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 60%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 60%, transparent 100%)',
          }}
        />
      </div>

      {/* Main glow - centered behind title */}
      <div
        ref={glowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-[0.05]"
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, #dc2626 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />
    </div>
  );
};

export default HeroBackground;
