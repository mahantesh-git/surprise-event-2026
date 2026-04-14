import React from 'react';
import { cn } from '@/lib/utils';

export interface NavbarProps {
  brandName?: string;
  ctaText?: string;
  onMenuOpen?: () => void;
  metaText?: string;
  className?: string;
}

/**
 * Navbar — minimal two-element: brand (left) + hamburger+Menu (right).
 * Transparent background, uppercase text, no border/shadow.
 */
export const Navbar: React.FC<NavbarProps> = ({
  brandName = 'Quest',
  ctaText = 'Menu',
  onMenuOpen,
  metaText,
  className,
}) => {
  return (
    <nav
      className={cn(
        'reveal-up fixed top-0 left-0 right-0 z-50',
        'flex justify-between items-center',
        'px-6 md:px-12 py-5 md:py-6',
        'bg-transparent',
        className
      )}
    >
      {/* Brand */}
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'inherit',
        }}
      >
        {brandName}
      </div>

      {/* Right side: meta + status + hamburger */}
      <div className="flex items-center gap-6">
        {/* Simulated System Status */}
        <div className="hidden md:flex flex-col items-end gap-1 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#95FF00] animate-pulse" />
            <span className="text-[8px] uppercase tracking-[0.2em] text-[#95FF00]/60">Link_Active</span>
          </div>
          <div className="text-[7px] text-white/20 uppercase tracking-[0.3em]">
            Packet_Loss: 0.0002%
          </div>
        </div>

        {metaText && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#95FF00]">
              {metaText}
            </span>
            <span className="text-[7px] text-white/30 uppercase tracking-[0.1em] font-mono">
              Vector_Assigned
            </span>
          </div>
        )}

        <div className="h-8 w-[1px] bg-white/10 mx-2" />

        <button
          onClick={onMenuOpen}
          className="flex items-center gap-3 bg-transparent border-none cursor-none p-0 group"
          aria-label="Open menu"
        >
          <div className="flex flex-col items-end space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] group-hover:text-[#95FF00] transition-colors">{ctaText}</span>
            <span className="text-[7px] font-mono text-white/20 uppercase tracking-[0.2em]">Matrix_Map</span>
          </div>
          <Hamburger />
        </button>
      </div>
    </nav>
  );
};

function Hamburger() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span style={{ display: 'block', width: '22px', height: '1.5px', background: 'currentColor' }} />
      <span style={{ display: 'block', width: '22px', height: '1.5px', background: 'currentColor' }} />
    </div>
  );
}

Navbar.displayName = 'Navbar';
