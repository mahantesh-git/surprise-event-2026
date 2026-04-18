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
  default: 'border border-[var(--color-accent)] bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-black transition-colors duration-200',
  primary: 'border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-black transition-colors duration-200 shadow-accent-sm hover:shadow-accent-md',
  danger: 'border border-[var(--color-accent)] bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-black transition-colors duration-200',
  ghost: 'bg-transparent text-[#ffffff] hover:text-[var(--color-accent)] transition-colors duration-200',
  secondary: 'border border-[rgba(255,255,255,0.2)] bg-transparent text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors duration-200',
  sage: 'border border-[var(--color-accent)] bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent)]/80 transition-colors duration-200 shadow-accent-md',
  ink: 'border border-[rgba(255,255,255,0.2)] bg-[#1A1D21] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors duration-200',
  blue: 'border border-blue-500 bg-transparent text-blue-500 hover:bg-blue-500 hover:text-black transition-colors duration-200',
  emerald: 'border border-[var(--color-accent)] bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-black transition-colors duration-200',
  amber: 'border border-[var(--color-accent)] bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-black transition-colors duration-200',
  rose: 'border border-[var(--color-accent)] bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-black transition-colors duration-200',
  violet: 'border border-violet-500 bg-transparent text-violet-500 hover:bg-violet-500 hover:text-black transition-colors duration-200',
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