import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'neon';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const badgeClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#1A1D21] text-white border border-[rgba(255,255,255,0.1)]',
  secondary: 'bg-[rgba(255,255,255,0.05)] text-white/70 border border-transparent',
  outline: 'border border-[#95FF00] text-[#95FF00]',
  destructive: 'bg-red-500/10 text-red-500 border border-red-500',
  neon: 'bg-[#95FF00]/10 text-[#95FF00] border border-[#95FF00]/50 shadow-[0_0_10px_rgba(149,255,0,0.1)]'
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest font-bold transition-colors',
        badgeClasses[variant],
        className,
      )}
      {...props}
    />
  );
}