import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, X } from 'lucide-react';

interface OnboardingGuideProps {
  isActive: boolean;
  onComplete: () => void;
}

interface Step {
  target: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    target: 'model-grid',
    title: 'Choose Your Model',
    description: 'Select a face model from your library, or create a new one with the + button below.',
  },
  {
    target: 'upload-zone',
    title: 'Upload a Reference',
    description: 'Upload a photo with the pose, outfit, and scene you want. The AI will place your model into it.',
  },
  {
    target: 'analyze-btn',
    title: 'Analyze & Prepare',
    description: 'Click here to let the AI extract the scene, lighting, and identity from both images. Uses 1 credit.',
  },
  {
    target: 'custom-instructions',
    title: 'Refine Your Vision',
    description: 'Optionally add specific instructions — like "warmer lighting" or "slight smile" — to fine-tune the result.',
  },
  {
    target: 'generate-section',
    title: 'Configure & Generate',
    description: 'Pick your resolution and aspect ratio, then hit Generate to create the final image.',
  },
  {
    target: 'output-area',
    title: 'Your Result',
    description: 'Your generated image appears here. Download it instantly or try a different pose variation.',
  },
];

const STORAGE_KEY = 'reed_onboarding_done';

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ isActive, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);

  const finish = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete();
  }, [onComplete]);

  const updateTargetRect = useCallback(() => {
    const step = STEPS[currentStep];
    if (!step) return;

    const el = document.querySelector(`[data-onboarding="${step.target}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    }
  }, [currentStep]);

  // Position tracking with ResizeObserver and scroll/resize listeners
  useEffect(() => {
    if (!isActive) return;

    // Small delay to let the DOM settle (lock overlays hidden, elements visible)
    const initTimer = setTimeout(() => {
      setIsVisible(true);
      updateTargetRect();
    }, 300);

    return () => clearTimeout(initTimer);
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !isVisible) return;

    updateTargetRect();

    const handleUpdate = () => {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(updateTargetRect);
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    const observer = new ResizeObserver(handleUpdate);
    const step = STEPS[currentStep];
    const el = step ? document.querySelector(`[data-onboarding="${step.target}"]`) : null;
    if (el) observer.observe(el);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      observer.disconnect();
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isActive, isVisible, currentStep, updateTargetRect]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finish();
    }
  };

  const handleSkip = () => {
    finish();
  };

  if (!isActive || !isVisible) return null;

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { opacity: 0 };

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipEstimatedHeight = 200;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Default: position to the right of the target
    let top = targetRect.top + targetRect.height / 2 - tooltipEstimatedHeight / 2;
    let left = targetRect.right + padding;

    // If not enough space on the right, try left
    if (left + tooltipWidth > viewportWidth - padding) {
      left = targetRect.left - tooltipWidth - padding;
    }

    // If not enough space on the left either, position below
    if (left < padding) {
      left = Math.max(padding, targetRect.left + targetRect.width / 2 - tooltipWidth / 2);
      top = targetRect.bottom + padding;

      // If not enough space below, position above
      if (top + tooltipEstimatedHeight > viewportHeight - padding) {
        top = targetRect.top - tooltipEstimatedHeight - padding;
      }
    }

    // Clamp to viewport
    top = Math.max(padding, Math.min(top, viewportHeight - tooltipEstimatedHeight - padding));
    left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      opacity: 1,
    };
  };

  // Spotlight cutout style
  const getSpotlightStyle = (): React.CSSProperties => {
    if (!targetRect) return { opacity: 0 };

    const pad = 8;
    return {
      position: 'fixed',
      top: `${targetRect.top - pad}px`,
      left: `${targetRect.left - pad}px`,
      width: `${targetRect.width + pad * 2}px`,
      height: `${targetRect.height + pad * 2}px`,
      borderRadius: '12px',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: 'none' as const,
      zIndex: 9999,
    };
  };

  return (
    <>
      {/* Spotlight cutout overlay */}
      <div style={getSpotlightStyle()} />

      {/* Click blocker behind tooltip */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 9998, cursor: 'default' }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        style={{ ...getTooltipStyle(), zIndex: 10000 }}
        className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-1 bg-[var(--bg-secondary)] w-full">
          <div
            className="h-full bg-reed-red transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-5">
          {/* Step counter + close */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-widest font-medium">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
              aria-label="Close onboarding"
            >
              <X size={14} />
            </button>
          </div>

          {/* Title */}
          <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-2">
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5">
            {step.description}
          </p>

          {/* Progress dots + actions */}
          <div className="flex items-center justify-between">
            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'w-5 h-2 bg-reed-red'
                      : i < currentStep
                        ? 'w-2 h-2 bg-reed-red/40'
                        : 'w-2 h-2 bg-[var(--border-color)]'
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {!isLastStep && (
                <button
                  onClick={handleSkip}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-3 py-1.5 transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 bg-reed-red text-white text-xs font-bold uppercase px-4 py-2 rounded-lg hover:bg-reed-red-dark transition-colors"
              >
                {isLastStep ? 'Got it' : 'Next'}
                {!isLastStep && <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingGuide;
