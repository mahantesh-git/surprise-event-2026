import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const badgeClasses: Record<BadgeVariant, string> = {
  default: 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900',
  secondary: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50',
  outline: 'border border-zinc-200 text-zinc-900 dark:border-zinc-800 dark:text-zinc-50',
  destructive: 'bg-red-600 text-white',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        badgeClasses[variant],
        className,
      )}
      {...props}
    />
  );
}