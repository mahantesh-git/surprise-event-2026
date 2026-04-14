import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  onComplete: () => void;
  duration?: number; // ms, default 1600
}

/**
 * LoadingScreen — slot-machine percentage counter (0 → 100%).
 * Dark full-screen overlay. Fades out when counter finishes.
 */
export function LoadingScreen({ onComplete, duration = 1600 }: LoadingScreenProps) {
  const [count, setCount] = useState(0);
  const [exiting, setExiting] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef   = useRef<number>(0);

  useEffect(() => {
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed  = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * 100);
      setCount(value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        // Start exit animation
        setExiting(true);
        setTimeout(onComplete, 600);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [duration, onComplete]);

  const hundreds = Math.floor(count / 100);
  const tens     = Math.floor((count % 100) / 10);
  const ones     = count % 10;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-[#0B0C0D] flex flex-col items-center justify-center p-6 overflow-hidden"
      style={{
        animation: exiting ? 'fade-out 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' : undefined,
        pointerEvents: exiting ? 'none' : 'all',
      }}
    >
      {/* Background glitch effect would go here if we had a canvas, but let's stick to CSS/HTML */}
      
      <div className="w-full max-w-sm space-y-8 relative">
        <div className="space-y-2 font-mono">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[#95FF00] animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#95FF00]">Kernel_Initialize</span>
          </div>
          <div className="text-[8px] uppercase tracking-[0.2em] text-white/20 leading-relaxed">
            {count > 10 && <div>&gt; SYSCALL_CONNECT_DB_REMOTE</div>}
            {count > 30 && <div>&gt; AUTH_NODE_VECTOR_LOCK</div>}
            {count > 50 && <div>&gt; LOAD_SIMULATION_MATRIX_V4</div>}
            {count > 80 && <div>&gt; BYPASS_FIREWALL_COMPLETE</div>}
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <div className="flex font-black text-6xl md:text-8xl tracking-tighter text-white">
            <SlotDigit value={hundreds} />
            <SlotDigit value={tens} />
            <SlotDigit value={ones} />
          </div>
          <span className="text-xl font-mono text-[#95FF00]/40 uppercase tracking-widest">%</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[8px] uppercase tracking-[0.4em] text-white/30 font-mono">
            <span>Progress_Buffer</span>
            <span>{count}%</span>
          </div>
          <div className="h-[2px] w-full bg-white/5 relative overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-[#95FF00]"
              style={{ width: `${count}%` }}
            />
            <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotDigit({ value }: { value: number }) {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return (
    <div className="loading-digit-col">
      <div
        className="loading-digit-inner"
        style={{ transform: `translateY(${-value * 100}%)` }}
      >
        {digits.map(d => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  );
}
