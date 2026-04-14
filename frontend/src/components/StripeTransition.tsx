import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface StripeTransitionHandle {
  /** Play in (bars slide down) then out (bars retract up). Returns a promise that resolves when fully done. */
  play: () => Promise<void>;
}

const BARS = 8;
const IN_DURATION  = 480; // ms
const HOLD         = 120; // ms between in and out
const OUT_DURATION = 400; // ms

/**
 * StripeTransition — 8 vertical bars that wipe down then retract.
 * Attach a ref and call `ref.current.play()` on route / stage changes.
 */
export const StripeTransition = forwardRef<StripeTransitionHandle>((_, ref) => {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    play: () => new Promise<void>((resolve) => {
      const bars = barsRef.current.filter(Boolean) as HTMLDivElement[];
      // Reset
      bars.forEach(b => { b.style.transition = 'none'; b.style.transform = 'scaleY(0)'; b.style.transformOrigin = 'top'; });

      // Force reflow
      void bars[0]?.offsetHeight;

      // In phase — staggered
      bars.forEach((b, i) => {
        b.style.transition = `transform ${IN_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 30}ms`;
        b.style.transform  = 'scaleY(1)';
      });

      // Out phase
      const outDelay = IN_DURATION + ((BARS - 1) * 30) + HOLD;
      setTimeout(() => {
        bars.forEach((b, i) => {
          b.style.transformOrigin = 'bottom';
          b.style.transition = `transform ${OUT_DURATION}ms cubic-bezier(0.4, 0, 1, 1) ${i * 25}ms`;
          b.style.transform  = 'scaleY(0)';
        });
        setTimeout(resolve, OUT_DURATION + ((BARS - 1) * 25) + 50);
      }, outDelay);
    }),
  }));

  return (
    <div className="stripe-overlay" aria-hidden="true">
      {Array.from({ length: BARS }).map((_, i) => (
        <div
          key={i}
          ref={el => { barsRef.current[i] = el; }}
          className="stripe-bar"
        />
      ))}
    </div>
  );
});

StripeTransition.displayName = 'StripeTransition';
