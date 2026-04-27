import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HardModeHUDProps {
  startTime: string;
}

export function HardModeHUD({ startTime }: HardModeHUDProps) {
  const [jackpot, setJackpot] = useState(1000);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const calculate = () => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const elapsedSeconds = Math.floor((now - start) / 1000);
      
      const decayInterval = 30;
      const decayRate = 50;
      const jackpotStart = 1000;
      
      const periods = Math.floor(elapsedSeconds / decayInterval);
      const currentJackpot = Math.max(0, jackpotStart - (periods * decayRate));
      
      // Fix: If jackpot is zero, freeze the timer at 0
      if (currentJackpot === 0) {
        setJackpot(0);
        setTimeLeft(0);
        return;
      }

      const remainingInPeriod = decayInterval - (elapsedSeconds % decayInterval);
      
      setJackpot(currentJackpot);
      setTimeLeft(remainingInPeriod);
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <div className="fixed top-24 right-4 md:right-8 z-50 pointer-events-none">
      <motion.div 
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="relative group"
      >
        {/* Glow Effect */}
        <div className={cn("absolute -inset-1 bg-[var(--color-accent)]/20 blur-xl rounded-lg transition-opacity duration-1000",
          jackpot > 0 ?"opacity-100" :"opacity-0"
        )} />

        <div className={cn("relative corner-card glass-morphism p-4 md:p-5 border-white/5 flex flex-col gap-3 min-w-[180px]",
          jackpot > 0 ?"border-[var(--color-accent)]/30" :"opacity-80"
        )}>
          {/* Status Label */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-1.5">
              <Zap className={cn("w-3 h-3 fill-[var(--color-accent)]", jackpot > 0 &&"animate-pulse")} />
              <span className={cn("text-[8px] font-mono uppercase tracking-[0.2em] font-black",
                jackpot > 0 ?"text-[var(--color-accent)]" :"text-white/40"
              )}>
                {jackpot > 0 ? 'Omega_Jackpot' : 'Jackpot_Depleted'}
              </span>
            </div>
            {jackpot > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-[var(--color-accent)] animate-ping" />
                <span className="text-[7px] font-mono text-[var(--color-accent)] uppercase">Live</span>
              </div>
            )}
          </div>
          
          {/* Jackpot Value */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-[var(--color-accent)] text-sm font-mono font-bold opacity-60">$</span>
              <span className={cn("text-3xl font-black tracking-tighter tabular-nums",
                jackpot > 0 ?"text-white" :"text-white/20"
              )}>
                {jackpot.toLocaleString()}
              </span>
            </div>
            <span className="text-[7px] font-mono uppercase tracking-[0.2em] text-white/30">Available_Credits</span>
          </div>

          {/* Progress Bar & Timer */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[7px] font-mono uppercase tracking-widest">
              <span className="text-white/40">Decay_Cycle</span>
              <div className="flex items-center gap-1 text-white/60">
                <Timer className="w-2.5 h-2.5" />
                <span>{timeLeft}S</span>
              </div>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden relative">
              <motion.div 
                initial={false}
                animate={{ width: `${(timeLeft / 30) * 100}%` }}
                className={cn("absolute top-0 left-0 h-full transition-colors duration-500",
                  jackpot > 0 ?"bg-[var(--color-accent)]" :"bg-white/10"
                )}
              />
            </div>
          </div>

          {/* Secondary Info */}
          <div className="flex justify-between items-center pt-1">
             <span className="text-[6px] font-mono text-white/20 uppercase tracking-[0.2em]">
               {jackpot > 0 ? 'Rate: -50 PTS / 30S' : 'Limit: Baseline reached'}
             </span>
          </div>
        </div>

        {/* Decorative HUD Corners */}
        <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-white/20" />
        <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-white/20" />
      </motion.div>
    </div>
  );
}
