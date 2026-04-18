import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-11 w-full border border-white/10 bg-[var(--color-bg-surface)] px-3 py-2 text-sm font-mono text-white transition-colors',
          'placeholder:text-white/20',
          'focus-visible:outline-none focus-visible:border-[var(--color-accent)]/40 focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';