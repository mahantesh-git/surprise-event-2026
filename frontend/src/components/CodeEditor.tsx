import React from 'react';
import { cn } from '@/lib/utils';

/**
 * CodeEditor Component - Sutéra Design System
 * Blueprint-style code container with monospace font
 */

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  enableAutoFocus?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter code...',
  readOnly = false,
  className,
  enableAutoFocus = false,
}) => {
  return (
    <div className={cn('relative border border-black bg-white', className)}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        autoFocus={enableAutoFocus}
        className={cn(
          'w-full h-48 p-3 md:p-4',
          'font-mono text-xs md:text-sm leading-relaxed',
          'bg-white text-black border-none outline-none resize-none',
          'placeholder:text-sutera-mark',
          'focus:ring-0',
          readOnly && 'bg-sutera-grid opacity-75 cursor-not-allowed'
        )}
      />
    </div>
  );
};

CodeEditor.displayName = 'CodeEditor';
