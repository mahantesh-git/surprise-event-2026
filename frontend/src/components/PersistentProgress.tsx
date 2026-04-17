import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface PersistentProgressProps {
  totalRounds: number;
  currentRound: number;
  roundsDone: boolean[];
}

export function PersistentProgress({ totalRounds, currentRound, roundsDone }: PersistentProgressProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-[#0B0C0D] flex gap-0.5">
      {Array.from({ length: totalRounds }).map((_, i) => {
        const isDone = roundsDone[i];
        const isActive = i === currentRound;

        return (
          <div key={i} className="flex-1 overflow-hidden relative">
            <div
              className={cn(
                "h-full w-full transition-all duration-700",
                isDone ? "bg-[#95FF00]" : (isActive ? "bg-[#333333]" : "bg-white/5")
              )}
            />
            {isActive && !isDone && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="absolute inset-0 bg-[#95FF00] shadow-[0_0_8px_#95FF00]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
