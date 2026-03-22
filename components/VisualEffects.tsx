import React, { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

// ── Custom Cursor ──
// Crosshair cursor with mix-blend-difference so it adapts to any background
export const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const trail = trailRef.current;
    if (!cursor || !trail) return;

    // Skip on touch devices
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) {
      cursor.style.display = 'none';
      trail.style.display = 'none';
      return;
    }

    const cursorX = gsap.quickTo(cursor, 'left', { duration: 0.08, ease: 'none' });
    const cursorY = gsap.quickTo(cursor, 'top', { duration: 0.08, ease: 'none' });
    const trailX = gsap.quickTo(trail, 'left', { duration: 0.4, ease: 'power3.out' });
    const trailY = gsap.quickTo(trail, 'top', { duration: 0.4, ease: 'power3.out' });

    const handleMove = (e: MouseEvent) => {
      cursorX(e.clientX);
      cursorY(e.clientY);
      trailX(e.clientX);
      trailY(e.clientY);
    };

    const handleDown = () => {
      gsap.to(cursor, { scale: 0.7, duration: 0.1 });
      gsap.to(trail, { scale: 0.8, duration: 0.15 });
    };
    const handleUp = () => {
      gsap.to(cursor, { scale: 1, duration: 0.2, ease: 'back.out(1.7)' });
      gsap.to(trail, { scale: 1, duration: 0.25, ease: 'back.out(1.7)' });
    };

    // Hover on interactive elements — scale up slightly, never disappear
    const onEnterInteractive = () => {
      gsap.to(cursor, { scale: 1.6, duration: 0.25, ease: 'power2.out' });
    };
    const onLeaveInteractive = () => {
      gsap.to(cursor, { scale: 1, duration: 0.25, ease: 'power2.out' });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('mouseup', handleUp);

    const bindInteractives = () => {
      const els = document.querySelectorAll('button, a, input, textarea, select, [role="button"]');
      els.forEach(el => {
        el.addEventListener('mouseenter', onEnterInteractive);
        el.addEventListener('mouseleave', onLeaveInteractive);
      });
      return els;
    };

    const els = bindInteractives();
    // Re-bind on DOM changes (React re-renders)
    const observer = new MutationObserver(() => bindInteractives());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('mouseup', handleUp);
      els.forEach(el => {
        el.removeEventListener('mouseenter', onEnterInteractive);
        el.removeEventListener('mouseleave', onLeaveInteractive);
      });
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* Cursor dot */}
      <div
        ref={cursorRef}
        className="fixed z-[9999] pointer-events-none"
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: '#dc2626',
          transform: 'translate(-50%, -50%)',
          willChange: 'left, top, transform',
          mixBlendMode: 'difference',
        }}
      />
      {/* Hidden trail ref for hover expand */}
      <div ref={trailRef} style={{ display: 'none' }} />
    </>
  );
};

// ── Magnetic Button Wrapper ──
// Wraps a button to make it subtly pull toward cursor on hover
export const MagneticButton: React.FC<{
  children: React.ReactNode;
  className?: string;
  strength?: number;
}> = ({ children, className = '', strength = 0.3 }) => {
  const btnRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;
    gsap.to(el, { x: deltaX, y: deltaY, duration: 0.3, ease: 'power2.out' });
  }, [strength]);

  const handleLeave = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  }, []);

  return (
    <div
      ref={btnRef}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ willChange: 'transform' }}
    >
      {children}
    </div>
  );
};

// ── 3D Tilt Card ──
// Adds perspective-based tilt on hover
export const TiltCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  style?: React.CSSProperties;
}> = ({ children, className = '', intensity = 8, style }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(el, {
      rotateY: x * intensity,
      rotateX: -y * intensity,
      duration: 0.3,
      ease: 'power2.out',
    });
  }, [intensity]);

  const handleLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.5, ease: 'power3.out' });
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ perspective: '800px', transformStyle: 'preserve-3d', willChange: 'transform', ...style }}
    >
      {children}
    </div>
  );
};

// ── Floating Accents ──
// Decorative geometric shapes that float with GSAP
export const FloatingAccents: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const shapes = container.querySelectorAll('.float-shape');
    const tweens: gsap.core.Tween[] = [];

    shapes.forEach((shape, i) => {
      gsap.set(shape, {
        x: gsap.utils.random(-20, 20),
        y: gsap.utils.random(-20, 20),
        rotation: gsap.utils.random(-15, 15),
      });

      tweens.push(
        gsap.to(shape, {
          y: `+=${gsap.utils.random(-30, 30)}`,
          x: `+=${gsap.utils.random(-15, 15)}`,
          rotation: `+=${gsap.utils.random(-20, 20)}`,
          duration: gsap.utils.random(4, 7),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.5,
        })
      );
    });

    return () => {
      tweens.forEach(t => t.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Ring */}
      <div className="float-shape absolute top-[15%] right-[12%] w-16 h-16 border border-reed-red/10 rounded-full" />
      {/* Small dot */}
      <div className="float-shape absolute top-[70%] right-[20%] w-2 h-2 bg-reed-red/20 rounded-full" />
      {/* Cross */}
      <div className="float-shape absolute top-[25%] left-[8%] w-4 h-4 opacity-[0.12]">
        <div className="absolute inset-x-0 top-1/2 h-px bg-reed-red -translate-y-1/2" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-reed-red -translate-x-1/2" />
      </div>
      {/* Diamond */}
      <div className="float-shape absolute bottom-[20%] left-[15%] w-3 h-3 border border-reed-red/15 rotate-45" />
      {/* Large ring */}
      <div className="float-shape absolute bottom-[35%] right-[5%] w-24 h-24 border border-reed-red/[0.06] rounded-full" />
      {/* Dot cluster */}
      <div className="float-shape absolute top-[50%] left-[5%] flex gap-1.5">
        <div className="w-1 h-1 bg-reed-red/15 rounded-full" />
        <div className="w-1 h-1 bg-reed-red/10 rounded-full" />
        <div className="w-1 h-1 bg-reed-red/20 rounded-full" />
      </div>
    </div>
  );
};

// ── Animated Counter ──
// Counts up a number when visible using IntersectionObserver + GSAP
export const AnimatedCounter: React.FC<{
  value: string;
  className?: string;
}> = ({ value, className = '' }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Extract number from value like "100%", "1-5", "Zero"
    const numMatch = value.match(/^(\d+)/);
    if (!numMatch) {
      // Non-numeric value, just show it
      el.textContent = value;
      return;
    }

    const target = parseInt(numMatch[1]);
    const suffix = value.slice(numMatch[1].length); // e.g., "%" or ""
    el.textContent = `0${suffix}`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const obj = { val: 0 };
          gsap.to(obj, {
            val: target,
            duration: 1.5,
            ease: 'power2.out',
            onUpdate: () => {
              el.textContent = `${Math.round(obj.val)}${suffix}`;
            },
          });
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref} className={className}>{value}</span>;
};

// ── Shimmer Text ──
// A gradient shimmer that sweeps across text
export const ShimmerText: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <span className={`shimmer-text ${className}`}>
      {children}
    </span>
  );
};
