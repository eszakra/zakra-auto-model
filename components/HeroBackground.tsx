import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface HeroBackgroundProps {
  className?: string;
}

export const HeroBackground: React.FC<HeroBackgroundProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Glow breathing animation
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        scale: 1.15,
        opacity: 0.25,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    // Grid subtle drift
    if (gridRef.current) {
      gsap.to(gridRef.current, {
        y: -6,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    // Floating particles
    if (particlesRef.current) {
      const particles = particlesRef.current.querySelectorAll('.hero-particle');
      particles.forEach((particle, i) => {
        gsap.set(particle, {
          x: gsap.utils.random(0, window.innerWidth),
          y: gsap.utils.random(0, window.innerHeight),
          scale: gsap.utils.random(0.3, 1),
          opacity: 0,
        });

        gsap.to(particle, {
          y: `-=${gsap.utils.random(100, 300)}`,
          x: `+=${gsap.utils.random(-50, 50)}`,
          opacity: gsap.utils.random(0.1, 0.4),
          duration: gsap.utils.random(4, 8),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.3,
        });
      });
    }
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Base background */}
      <div className="absolute inset-0 bg-[var(--bg-primary)]" />

      {/* Full-height perspective grid covering entire hero */}
      <div
        ref={gridRef}
        className="absolute inset-0"
        style={{
          perspective: '800px',
          perspectiveOrigin: '50% 40%',
        }}
      >
        <div
          className="absolute inset-0 origin-center"
          style={{
            transform: 'rotateX(45deg) translateZ(-50px)',
            background: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 79px,
                rgba(220, 38, 38, 0.10) 79px,
                rgba(220, 38, 38, 0.10) 80px
              ),
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 79px,
                rgba(220, 38, 38, 0.10) 79px,
                rgba(220, 38, 38, 0.10) 80px
              )
            `,
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 15%, black 40%, black 70%, rgba(0,0,0,0.4) 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 15%, black 40%, black 70%, rgba(0,0,0,0.4) 85%, transparent 100%)',
          }}
        />
      </div>

      {/* Main centered glow - big, visible red atmosphere */}
      <div
        ref={glowRef}
        className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] opacity-[0.18]"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, #dc2626 0%, rgba(220, 38, 38, 0.5) 25%, rgba(220, 38, 38, 0.15) 50%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Accent glow behind the image area (right side) */}
      <div
        className="absolute top-[40%] right-[8%] w-[500px] h-[500px] opacity-[0.10]"
        style={{
          background: 'radial-gradient(circle, #dc2626 0%, rgba(220, 38, 38, 0.3) 40%, transparent 65%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Floating particles */}
      <div ref={particlesRef} className="absolute inset-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="hero-particle absolute w-1 h-1 rounded-full bg-reed-red/30"
          />
        ))}
      </div>

      {/* Subtle top-edge vignette to blend nav area */}
      <div
        className="absolute top-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(to bottom, var(--bg-primary) 0%, transparent 100%)',
        }}
      />
    </div>
  );
};

export default HeroBackground;
