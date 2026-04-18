import React from 'react';
import { motion } from 'motion/react';
import { Code2, Navigation, Zap } from 'lucide-react';
import { GridBackground } from '@/components/GridBackground';

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
    <div className="relative min-h-screen bg-[var(--color-bg-void)] text-white overflow-hidden flex flex-col justify-center px-6 md:px-12 pt-20 pb-12">
      {/* Ambient orbs handle the background now */}



      <div className="max-w-6xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

        {/* Left Col - Hero Title */}
        <div className="lg:col-span-7 pr-0 lg:pr-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 border border-[var(--color-accent)]/40 px-4 py-1.5 bg-[var(--color-accent)]/5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">
              <span className="w-1 h-1 bg-[var(--color-accent)]" />
              Secure_Connection_Active
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(3.5rem,8vw,7rem)] font-bold uppercase tracking-tighter leading-[0.85] mb-8 font-space-grotesk text-white">
              QUEST <br />
              <span className="text-white/10">THE CODE</span><br />
              <span className="text-[var(--color-accent)]" style={{ textShadow: '0 0 50px rgba(238, 58, 23, 0.3)' }}>SCAVENGER</span>
            </h1>

            {/* Subtext */}
            <p className="font-mono text-xs tracking-wider text-white/40 max-w-sm leading-relaxed border-l border-[var(--color-accent)]/40 pl-6 py-2 uppercase">
              Operational synchronization required. Select your clearance role to initialize mission protocol.
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
              transition={{ delay: role.delay + 0.3, duration: 0.6, ease: "easeOut" }}
              whileHover={{ x: 10 }}
              onClick={() => onSelect(role.key)}
              className="corner-card group relative text-left bg-[var(--color-bg-surface)] backdrop-blur-xl border border-white/5 hover:border-[var(--color-accent)]/40 transition-all duration-300 cursor-crosshair overflow-hidden p-8"
            >
              <div className="corner-br opacity-20 group-hover:opacity-100" />
              <div className="corner-bl opacity-20 group-hover:opacity-100" />

              {/* Giant background number overlay */}
              <div className="absolute -top-4 -right-2 text-[120px] font-bold opacity-[0.03] text-white group-hover:text-[var(--color-accent)] group-hover:opacity-[0.08] transition-all duration-500 leading-none tracking-tighter pointer-events-none font-space-grotesk">
                0{idx + 1}
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-5 mb-4">
                  <div className="w-14 h-14 rounded-none bg-black border border-white/10 flex items-center justify-center text-white/40 group-hover:text-[var(--color-accent)] group-hover:border-[var(--color-accent)] transition-all duration-300">
                    {role.icon}
                  </div>
                  <h3 className="text-4xl font-bold uppercase tracking-tight text-white group-hover:text-[var(--color-accent)] transition-colors font-space-grotesk">
                    {role.label}
                  </h3>
                </div>

                <p className="font-mono text-[11px] text-white/30 tracking-widest leading-relaxed min-h-[48px] uppercase">
                  {role.sub}
                </p>

                <div className="mt-8 flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    ACCESS_NODE_0{idx + 1}
                  </span>
                  <div className="h-[1px] flex-1 mx-4 bg-[var(--color-accent)]/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                  <span className="font-mono text-sm text-[var(--color-accent)] transition-transform duration-300 group-hover:translate-x-2">
                    [ INITIALIZE ]
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
