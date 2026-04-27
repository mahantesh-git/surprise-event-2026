import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface TacticalStatusProps {
  tone?: 'info' | 'success' | 'error' | 'warning';
  label?: string;
  message: string;
  icon: LucideIcon;
  className?: string;
}

export function TacticalStatus({
  tone = 'info',
  label = 'SYSTEM',
  message,
  icon: Icon,
  className
}: TacticalStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        type:"spring",
        stiffness: 400,
        damping: 30
      }}
      className={cn("flex items-center gap-4 px-6 py-2.5 rounded-[20px] border  shadow-2xl transition-colors duration-500 max-w-full",
        tone === 'success'
          ?"border-emerald-500/30 bg-black/90"
          : tone === 'error'
            ?"border-red-500/30 bg-black/90"
            : tone === 'warning'
              ?"border-red-500/30 bg-black/90 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
              :"border-white/10 bg-black/90",
        className
      )}
    >
      {/* Status indicator bar instead of icon */}
      <div className={cn("w-1 h-8 rounded-full transition-colors duration-500",
        tone === 'success' ?"bg-emerald-500" :
          tone === 'error' ?"bg-red-500" :
            tone === 'warning' ?"bg-red-500" :"bg-white/20"
      )} />

      {/* Content Container */}
      <div className="flex flex-col min-w-0 pr-2">
        <span className="text-[9px] uppercase tracking-[0.25em] text-white/30 font-black font-mono leading-none mb-0.5">
          {label}
        </span>
        <span
          className="text-[12px]/[16px] font-black uppercase tracking-[0.15em] text-white break-words"
          style={{ textTransform: 'uppercase' }}
        >
          {message}
        </span>
      </div>

      {/* Decorative End Element */}
      <div className="w-[2px] h-5 bg-white/5 rounded-full ml-auto" />
    </motion.div>
  );
}
