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
          'flex h-11 w-full border-b-2 border-white/20 bg-transparent px-3 py-2 text-sm font-mono text-white transition-colors rounded-none',
          'placeholder:text-white/20',
          'focus-visible:outline-none focus-visible:border-[var(--color-accent)] focus-visible:bg-white/[0.03]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';