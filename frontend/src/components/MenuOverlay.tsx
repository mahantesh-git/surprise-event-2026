import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  role?: string | null;
  teamName?: string;
  onLogout?: () => void;
  onNavigate?: (path: string) => void;
}

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Solver', path: '/solver' },
  { label: 'Runner', path: '/runner' },
  { label: 'Admin', path: '/admin' },
];

/**
 * MenuOverlay — full-screen var(--color-bg-surface) overlay with editorial nav items.
 * Each nav item: text slides up with green marquee band on hover.
 */
export function MenuOverlay({ isOpen, onClose, role, teamName, onLogout, onNavigate }: MenuOverlayProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleNav = (path: string) => {
    onClose();
    setTimeout(() => onNavigate?.(path), 200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="menu-overlay"
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(20, 20, 25, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 48px',
          }}
        >
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          {/* Top bar */}
          <div className="flex justify-between items-center mb-16 relative z-10">
            <div className="text-[12px] font-black uppercase tracking-[0.4em] text-white flex items-center gap-4">
              <div className="w-8 h-[1px] bg-white/20" />
              Quest<span className="text-[var(--color-accent)]">_</span>Protocol
            </div>

            <button
              onClick={onClose}
              className="flex items-center gap-3 bg-transparent border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase transition-all hover:bg-white/5 hover:border-white/30"
              aria-label="Close menu"
            >
              <X size={12} className="text-[var(--color-accent)]" />
              Close_Stream
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 flex flex-col justify-center gap-0 relative z-10">
            {NAV_LINKS.map((link, i) => (
              <MenuNavItem
                key={link.path}
                label={link.label}
                delay={i * 0.06}
                onClick={() => handleNav(link.path)}
                active={link.path === `/${role ?? ''}`}
              />
            ))}
          </nav>

          {/* Footer: Status Report Style */}
          <div className="border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-end gap-8 relative z-10">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-1 h-3 bg-[var(--color-accent)]" />
                <span className="text-[9px] uppercase tracking-[0.4em] text-white/30 font-mono">Session_Telemetry</span>
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                <div className="flex flex-col">
                  <span className="text-[7px] uppercase tracking-widest text-white/20 mb-1">Authenticated_As</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white/80">{teamName || 'GUEST_000'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] uppercase tracking-widest text-white/20 mb-1">Clearance_Level</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-accent)]">{role?.toUpperCase() || 'EXTERNAL'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] uppercase tracking-widest text-white/20 mb-1">Encryption</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white/40 font-mono">RSA_4096_ACTIVE</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] uppercase tracking-widest text-white/20 mb-1">Location</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white/40 font-mono">LAT_COORD_PND</span>
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={() => { onClose(); setTimeout(onLogout, 200); }}
                className="group flex flex-col items-end gap-1"
              >
                <div className="border border-[var(--color-accent)]/20 px-6 py-3 text-[11px] uppercase tracking-[0.3em] font-black group-hover:bg-[var(--color-accent)]/10 group-hover:border-[var(--color-accent)]/50 transition-all text-[var(--color-accent)]/60 group-hover:text-[var(--color-accent)]">
                  Abort_Session
                </div>
                <span className="text-[7px] text-white/10 uppercase tracking-[0.4em] mr-1">Disconnect_Hard</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Individual nav item ── */
interface MenuNavItemProps {
  label: string;
  delay: number;
  onClick: () => void;
  active?: boolean;
}

function MenuNavItem({ label, delay, onClick, active }: MenuNavItemProps) {
  const marqRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const onEnter = () => {
    if (marqRef.current) marqRef.current.style.transform = 'translateY(0)';
    if (textRef.current) textRef.current.style.transform = 'translateY(-100%)';
  };
  const onLeave = () => {
    if (marqRef.current) marqRef.current.style.transform = 'translateY(100%)';
    if (textRef.current) textRef.current.style.transform = 'translateY(0)';
  };

  return (
    <motion.button
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '20px 0',
        textAlign: 'left',
        cursor: 'none',
        fontFamily: 'inherit',
        width: '100%',
      }}
    >
      {/* Main label */}
      <span
        ref={textRef}
        style={{
          display: 'block',
          fontSize: 'clamp(32px, 6vw, 72px)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: active ? 'var(--color-accent)' : '#ffffff',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {label}
      </span>

      {/* Marquee hover band */}
      <div
        ref={marqRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--color-accent)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '0',
          transform: 'translateY(100%)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <span
          style={{
            fontSize: 'clamp(32px, 6vw, 72px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--color-bg-surface)',
            lineHeight: 1,
          }}
        >
          {label}
        </span>
      </div>
    </motion.button>
  );
}
