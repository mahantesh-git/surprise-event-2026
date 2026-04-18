import React from 'react';
import { cn } from '@/lib/utils';
import { GameTimer } from './GameTimer';

export interface NavbarProps {
  brandName?: string;
  ctaText?: string;
  onMenuOpen?: () => void;
  metaText?: string;
  className?: string;
  startTime?: string | null;
  finishTime?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  brandName = 'Quest : The Code Scavenger',
  ctaText,
  onMenuOpen,
  metaText,
  className,
  startTime,
  finishTime,
}) => {
  // Use the brand name from props, or default to the requested title if it's the old 'QUEST' placeholder
  const displayBrand = brandName === 'QUEST' ? 'Quest : The Code Scavenger' : brandName;

  return (
    <div className="fixed top-4 sm:top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none reveal-up">
      <nav
        className={cn(
          'flex items-center gap-4 sm:gap-8 px-4 py-2 sm:py-2.5',
          'bg-[var(--color-bg-surface)] border border-[var(--color-accent)]/30 rounded-full shadow-2xl pointer-events-auto',
          className
        )}
      >
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5">
          {/* Red bars */}
          <div className="flex gap-[3px]">
            <div className="w-1 sm:w-1.5 h-3.5 sm:h-4 bg-[var(--color-accent)] rounded-sm"></div>
            <div className="w-1 sm:w-1.5 h-3.5 sm:h-4 bg-[var(--color-accent)] rounded-sm"></div>
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase text-white whitespace-nowrap">
            {displayBrand}
          </span>
        </div>

        {/* Right: Meta & Dot */}
        <div className="flex items-center gap-3 sm:gap-4 ml-auto sm:ml-0 pl-3 sm:pl-0 border-l sm:border-l-0 border-white/10">
          {metaText && (
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              {metaText}
            </span>
          )}

          {/* Show the menu button only if there's no metaText (like in the login screen for Admin) */}
          {onMenuOpen && !metaText && (
            <button
              onClick={onMenuOpen}
              className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 hover:text-white transition-colors"
            >
              {ctaText || 'Menu'}
            </button>
          )}

          <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]"></div>
        </div>
      </nav>
    </div>
  );
};

Navbar.displayName = 'Navbar';
