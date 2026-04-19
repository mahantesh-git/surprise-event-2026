import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface TacticalStatusProps {
  tone?: 'info' | 'success' | 'error' | 'warning';
  label: string;
  message: string;
  icon: LucideIcon;
  className?: string;
}

export function TacticalStatus({ 
  tone = 'info', 
  label, 
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
        type: "spring",
        stiffness: 400,
        damping: 30
      }}
      className={cn(
        "flex items-center gap-4 px-6 py-2.5 rounded-[20px] border backdrop-blur-md shadow-2xl transition-colors duration-500 max-w-full",
        tone === 'success' 
          ? "border-white/20 bg-black/90"
          : tone === 'error'
          ? "border-white/20 bg-black/90"
          : tone === 'warning'
          ? "border-yellow-500/30 bg-black/90"
          : "border-white/10 bg-black/90",
        className
      )}
    >
      {/* Icon Container - Standardized Circle */}
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-colors duration-500",
        tone === 'success' ? "bg-[var(--color-accent)]/20" : 
        tone === 'error' ? "bg-[var(--color-accent)]/20" : 
        tone === 'warning' ? "bg-yellow-500/20" : 
        "bg-white/5"
      )}>
        <Icon className={cn(
          "w-4.5 h-4.5", 
          tone === 'success' ? "text-[var(--color-accent)]" : 
          tone === 'error' ? "text-[var(--color-accent)]" : 
          tone === 'warning' ? "text-yellow-500" : 
          "text-white/40"
        )} />
      </div>

      {/* Content Container */}
      <div className="flex flex-col min-w-0 pr-2">
        <span className="text-[9px] uppercase tracking-[0.25em] text-white/30 font-black font-mono leading-none mb-0.5">
          {label}
        </span>
        <span className="text-[12px]/[16px] font-black uppercase tracking-[0.15em] text-white break-words">
          {message}
        </span>
      </div>

      {/* Decorative End Element */}
      <div className="w-[2px] h-5 bg-white/5 rounded-full ml-auto" />
    </motion.div>
  );
}
