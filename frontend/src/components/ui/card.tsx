import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Sutéra Design System Card Components
 * - Blueprint style: Black border, white bg, corner decoration
 * - No shadows - depth via layering
 * - Optional SVG corner marker
 */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div 
      className={cn(
        'corner-card reveal-card relative text-white',
        'p-4 md:p-5',
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        'flex flex-col space-y-1.5 pb-3 md:pb-4 mb-3 md:mb-4 border-b border-[rgba(255,255,255,0.1)]',
        className
      )} 
      {...props} 
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 
      className={cn(
        'text-m md:text-lg font-space-grotesk font-bold leading-tight uppercase text-white',
        className
      )} 
      {...props} 
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p 
      className={cn(
        'text-xs md:text-s text-white/50 leading-relaxed font-mono',
        className
      )} 
      {...props} 
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        'text-xs md:text-s leading-relaxed',
        className
      )} 
      {...props} 
    />
  );
}