import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Tech-Noir Button Component
 * - Sharp rectangular edges
 * - Neon interactions
 */

type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost' | 'secondary' | 'sage' | 'ink' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-200 [clip-path:var(--clip-oct)]',
  primary: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-200 [clip-path:var(--clip-oct)]',
  danger: 'bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-200 [clip-path:var(--clip-oct)]',
  ghost: 'bg-transparent text-white hover:text-[var(--color-accent)] transition-colors duration-200 [clip-path:var(--clip-oct)]',
  secondary: 'bg-[rgba(255,255,255,0.05)] text-white hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-200 [clip-path:var(--clip-oct)]',
  sage: 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/80 transition-colors duration-200 [clip-path:var(--clip-oct)]',
  ink: 'bg-[#1A1D21] text-white hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-200 [clip-path:var(--clip-oct)]',
  blue: 'bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-200 [clip-path:var(--clip-oct)]',
  emerald: 'bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-200 [clip-path:var(--clip-oct)]',
  amber: 'bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-200 [clip-path:var(--clip-oct)]',
  rose: 'bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-200 [clip-path:var(--clip-oct)]',
  violet: 'bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-200 [clip-path:var(--clip-oct)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2 py-0.5 text-[10px] leading-none',
  sm: 'px-3 py-1.5 text-xs leading-none',
  md: 'px-6 py-2.5 text-sm leading-tight',
  lg: 'px-8 py-3 text-base leading-tight',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-space-grotesk font-bold uppercase tracking-[0.2em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';