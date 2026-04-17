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
          'flex h-11 w-full border border-[rgba(255,255,255,0.2)] bg-[#0B0C0D] px-3 py-2 text-sm font-mono text-white transition-colors',
          'placeholder:text-white/30',
          'focus-visible:outline-none focus-visible:border-[#95FF00] focus-visible:ring-1 focus-visible:ring-[#95FF00]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';