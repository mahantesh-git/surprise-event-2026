import React from 'react';
import { cn } from '@/lib/utils';

/**
 * OutputDisplay Component - Sutéra Design System
 * Shows compilation/execution output in a blueprint card
 */

export interface OutputDisplayProps {
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
  className?: string;
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({
  stdout,
  stderr,
  timedOut = false,
  className,
}) => {
  const hasContent = stdout || stderr || timedOut;

  if (!hasContent) return null;

  return (
    <div className={cn('relative glass-morphism', className)}>
      {/* Corner marker */}
      <div className="absolute -top-px -right-px w-4 h-4 glass-morphism border-l border-b border-white/10" />

      <div className="p-3 md:p-4">
        <h4 className="text-xs font-bold tracking-widest uppercase mb-2 text-sutera-mark">
          Output
        </h4>

        {/* Stdout */}
        {stdout && (
          <div className="mb-3">
            <pre className="font-mono text-[10px] md:text-xs leading-tight whitespace-pre-wrap break-words glass-morphism-inner p-3 border-white/10 text-white/80 custom-scrollbar">
              {stdout}
            </pre>
          </div>
        )}

        {/* Stderr */}
        {stderr && (
          <div className="mb-3">
            <p className="text-[10px] text-[var(--color-accent)] font-mono leading-tight mb-1">Error:</p>
            <pre className="font-mono text-[10px] md:text-xs leading-tight whitespace-pre-wrap break-words glass-morphism-inner p-3 border-[var(--color-accent)]/30 text-[var(--color-accent)] custom-scrollbar">
              {stderr}
            </pre>
          </div>
        )}
        
        {/* Timeout warning */}
        {timedOut && (
          <div className="p-3 border-l-2 border-[var(--color-accent)] glass-morphism-inner text-[var(--color-accent)] text-[10px] md:text-xs">
            <span className="font-bold mr-1">⚠</span> EXECUTION TIMEOUT: Process terminated after safety limit.
          </div>
        )}
      </div>
    </div>
  );
};

OutputDisplay.displayName = 'OutputDisplay';
