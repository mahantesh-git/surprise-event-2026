import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface PersistentProgressProps {
  totalRounds: number;
  currentRound: number;
  roundsDone: boolean[];
  difficulty?: 'normal' | 'hard';
}

export function PersistentProgress({ totalRounds, currentRound, roundsDone, difficulty }: PersistentProgressProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-[var(--color-bg-surface)] flex gap-0.5">
      {Array.from({ length: totalRounds }).map((_, i) => {
        const isDone = roundsDone[i];
        const isActive = i === currentRound;

        return (
          <div key={i} className="flex-1 overflow-hidden relative">
            <div
              className={cn(
                "h-full w-full transition-all duration-700",
                isDone ? "bg-[var(--color-accent)]" : (isActive ? "bg-[#333333]" : "bg-white/5")
              )}
            />
            {isActive && !isDone && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className={cn(
                  "absolute inset-0 shadow-accent-xs",
                  difficulty === 'hard' ? "bg-red-600 shadow-[0_0_15px_red]" : "bg-[var(--color-accent)]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
