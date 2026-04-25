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
          'glass-morphism rounded-none [clip-path:var(--clip-edges)] border-b border-[var(--color-accent)]/20 shadow-2xl pointer-events-auto',
          className
        )}
      >
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Red bars */}
          <div className="flex gap-[3px] skew-x-12">
            <div className="w-1 sm:w-1.5 h-3.5 sm:h-4 bg-[var(--color-accent)] rounded-none"></div>
            <div className="w-1 sm:w-1.5 h-3.5 sm:h-4 bg-[var(--color-accent)] rounded-none"></div>
          </div>
          <span className="font-orbitron text-[10px] sm:text-[11px] font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase text-white whitespace-nowrap">
            {displayBrand}
          </span>
        </div>

        {/* Center: Timer */}
        {startTime && (
          <div className="hidden sm:flex items-center border-l border-white/10 pl-8">
            <GameTimer startTime={startTime ?? null} finishTime={finishTime ?? null} />
          </div>
        )}

        {/* Right: Meta & Dot */}
        <div className="flex items-center gap-3 sm:gap-4 ml-auto pl-3 sm:pl-8 sm:border-l border-white/10">
          {startTime && (
            <div className="flex sm:hidden">
              <GameTimer startTime={startTime ?? null} finishTime={finishTime ?? null} />
            </div>
          )}

          {metaText && (
            <span className="font-orbitron text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              {metaText}
            </span>
          )}

          {/* Show the menu button only if there's no metaText (like in the login screen for Admin) */}
          {onMenuOpen && !metaText && (
            <button
              onClick={onMenuOpen}
              className="font-orbitron text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 hover:text-white transition-colors"
            >
              {ctaText || 'Menu'}
            </button>
          )}

          <div className="w-2 h-2 bg-[var(--color-accent)] skew-x-12"></div>
        </div>
      </nav>
    </div>
  );
};

Navbar.displayName = 'Navbar';
