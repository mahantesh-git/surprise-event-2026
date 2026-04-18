import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'neon';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const badgeClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#1A1D21] text-white border border-[rgba(255,255,255,0.1)]',
  secondary: 'bg-[rgba(255,255,255,0.05)] text-white/70 border border-transparent',
  outline: 'border border-[var(--color-accent)] text-[var(--color-accent)]',
  destructive: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/30 shadow-accent-xs',
  neon: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/50 shadow-accent-sm'
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