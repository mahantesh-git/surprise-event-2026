import React from 'react';
import { motion } from 'motion/react';
import { Code2, Navigation, Zap } from 'lucide-react';

interface RoleSelectionProps {
  onSelect: (role: 'solver' | 'runner') => void;
}

export function RoleSelection({ onSelect }: RoleSelectionProps) {
  const roles = [
    {
      key: 'solver' as const,
      label: 'Solver',
      sub: 'Decode complex puzzles, execute logic, and unearth hidden coordinates to guide your operative in the field.',
      icon: <Code2 size={24} strokeWidth={1.5} />,
      delay: 0.1,
    },
    {
      key: 'runner' as const,
      label: 'Runner',
      sub: 'Navigate physical space, locate key informants, and scan access nodes to secure critical data fragments.',
      icon: <Navigation size={24} strokeWidth={1.5} />,
      delay: 0.2,
    },
  ];

  return (
    <div className="relative h-[100dvh] text-white overflow-x-hidden overflow-y-auto">
      <div className="min-h-full flex flex-col justify-center px-4 sm:px-6 md:px-12 pt-16 sm:pt-24 pb-12">
        {/* TOP BAR INDICATOR */}
        <div className="fixed top-2 left-4 md:top-8 md:left-8 z-[100] flex items-center gap-3">
          <div className="w-2 h-2 bg-[var(--color-accent)] animate-pulse shadow-[0_0_10px_var(--color-accent)]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-accent)] font-bold">
            PROTOCOL: INITIALIZATION_REQUIRED
          </span>
        </div>

        <div className="max-w-[1400px] mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-16 items-center">
          {/* Left Col - Hero Title */}
          <div className="lg:col-span-7 pr-0 lg:pr-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease:"easeOut" }}
              className="mb-4 sm:mb-12"
            >
              {/* Headline */}
              <h1 className="text-[clamp(1.8rem,10vw,7rem)] font-bold uppercase tracking-tighter leading-none mb-2 sm:mb-8 font-orbitron text-white">
                <span className="block sm:inline">QUEST </span>
                <span className="text-white/20 text-[clamp(1.2rem,6vw,4rem)] block sm:inline">THE CODE</span><br className="hidden sm:block" />
                <span className="text-[var(--color-accent)] text-[clamp(1.8rem,9vw,7rem)]" style={{ textShadow: '0 0 50px rgba(217, 31, 64, 0.3)' }}>SCAVENGER</span>
              </h1>

              {/* Subtext */}
              <p className="label-technical text-white/40 max-w-xs mb-6 sm:mb-12 leading-relaxed text-[9px] sm:text-[11px]">
                OPERATIONAL SYNCHRONIZATION REQUIRED.<br className="sm:hidden" />
                SELECT YOUR CLEARANCE ROLE TO INITIALIZE MISSION PROTOCOL.
              </p>
            </motion.div>
          </div>

          {/* Right Col - Role Selection Cards */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {roles.map((role, idx) => (
              <motion.button
                key={role.key}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: role.delay + 0.3, duration: 0.6, ease:"easeOut" }}
                whileHover={{ x: 10 }}
                onClick={() => onSelect(role.key)}
                className="corner-card group relative text-left glass-morphism hover:border-[var(--color-accent)]/50 transition-all duration-500 cursor-crosshair overflow-hidden p-4 sm:p-6 md:p-8 !rounded-none"
              >
                {/* Aura Forming Effect */}
                <motion.div
                  className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
                  animate={{
                    background: [
                      'radial-gradient(circle at 30% 30%, rgba(238, 58, 23, 0.15) 0%, transparent 70%)',
                      'radial-gradient(circle at 70% 70%, rgba(238, 58, 23, 0.15) 0%, transparent 70%)',
                      'radial-gradient(circle at 30% 70%, rgba(238, 58, 23, 0.15) 0%, transparent 70%)',
                      'radial-gradient(circle at 70% 30%, rgba(238, 58, 23, 0.15) 0%, transparent 70%)',
                    ]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease:"linear" }}
                />

                {/* Static faint aura for idle state */}
                <div className="absolute inset-0 z-0 bg-radial-gradient from-[var(--color-accent)]/5 to-transparent opacity-30" />

                {/* Rained Glass Texture (Subtle Grain) */}
                <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')] brightness-100 contrast-150" />

                {/* Blinking Border Effect on Hover */}
                <motion.div
                  className="absolute inset-0 z-10 border-2 border-[var(--color-accent)] pointer-events-none opacity-0 group-hover:opacity-100"
                  animate={{
                    borderColor: ['rgba(238, 58, 23, 1)', 'rgba(238, 58, 23, 0.2)', 'rgba(238, 58, 23, 1)'],
                    boxShadow: [
                      '0 0 10px rgba(238, 58, 23, 0.3), inset 0 0 10px rgba(238, 58, 23, 0.2)',
                      '0 0 20px rgba(238, 58, 23, 0.1), inset 0 0 5px rgba(238, 58, 23, 0.1)',
                      '0 0 10px rgba(238, 58, 23, 0.3), inset 0 0 10px rgba(238, 58, 23, 0.2)'
                    ]
                  }}
                  transition={{ duration: 0.8, repeat: Infinity, ease:"easeInOut" }}
                  style={{ clipPath: 'var(--clip-oct)' }}
                />

                {/* Corner Accents (Sharp) */}
                <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10 group-hover:border-[var(--color-accent)]/40 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-white/10 group-hover:border-[var(--color-accent)]/40 transition-colors duration-500" />

                {/* Giant background number overlay */}
                <div className="absolute -top-4 -right-2 text-[80px] sm:text-[120px] font-bold opacity-[0.03] text-white group-hover:text-[var(--color-accent)] group-hover:opacity-[0.08] transition-all duration-700 leading-none tracking-tighter pointer-events-none font-orbitron italic">
                  0{idx + 1}
                </div>

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-4 sm:gap-5 mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-none [clip-path:var(--clip-oct)] bg-white/[0.04] glass-morphism  border border-white/10 flex items-center justify-center text-white/40 group-hover:text-[var(--color-accent)] group-hover:border-[var(--color-accent)]/50 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(217,31,64,0.2)]">
                      {role.icon}
                    </div>
                    <h3 className="text-xl sm:text-4xl font-bold uppercase tracking-tight text-white group-hover:text-[var(--color-accent)] transition-colors duration-500 font-orbitron">
                      {role.label}
                    </h3>
                  </div>

                  <p className="text-[10px] sm:text-xs text-white/40 leading-relaxed min-h-[auto] sm:min-h-[48px] mb-2 sm:mb-0 group-hover:text-white/60 transition-colors duration-500">
                    {role.sub}
                  </p>

                  <div className="mt-4 sm:mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                    <div className="flex flex-col">
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                        ACCESS_NODE_0{idx + 1}
                      </span>
                      <span className="font-mono text-[8px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-white/20">
                        READY_FOR_INIT
                      </span>
                    </div>
                    <div className="hidden sm:block h-[1px] flex-1 mx-4 bg-[var(--color-accent)]/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-700" />
                    <div className="flex items-center gap-2 group-hover:translate-x-2 transition-transform duration-500 self-start sm:self-auto">
                      <span className="font-mono text-xs sm:text-sm text-[var(--color-accent)] font-bold tracking-widest">
                        [ INITIALIZE ]
                      </span>
                      <Zap size={14} className="text-[var(--color-accent)] animate-pulse" />
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
