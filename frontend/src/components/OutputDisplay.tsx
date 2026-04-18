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
    <div className={cn('relative border border-black bg-white', className)}>
      {/* Corner marker */}
      <div className="absolute -top-px -right-px w-4 h-4 bg-white border-l border-b border-black" />

      <div className="p-3 md:p-4">
        <h4 className="text-xs font-bold tracking-widest uppercase mb-2 text-sutera-mark">
          Output
        </h4>

        {/* Stdout */}
        {stdout && (
          <div className="mb-3">
            <pre className="font-mono text-[10px] md:text-xs leading-tight whitespace-pre-wrap break-words bg-sutera-grid p-2 border border-sutera-secondary text-black">
              {stdout}
            </pre>
          </div>
        )}

        {/* Stderr */}
        {stderr && (
          <div className="mb-3">
            <p className="text-[10px] text-[var(--color-accent)] font-mono leading-tight mb-1">Error:</p>
            <pre className="font-mono text-[10px] md:text-xs leading-tight whitespace-pre-wrap break-words bg-[var(--color-accent)]/5 p-2 border border-[var(--color-accent)]/20 text-[var(--color-accent)]">
              {stderr}
            </pre>
          </div>
        )}
        
        {/* Timeout warning */}
        {timedOut && (
          <div className="p-2 border-l-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5 text-[var(--color-accent)] text-[10px] md:text-xs">
            ⚠ Execution timeout (4 seconds exceeded)
          </div>
        )}
      </div>
    </div>
  );
};

OutputDisplay.displayName = 'OutputDisplay';
