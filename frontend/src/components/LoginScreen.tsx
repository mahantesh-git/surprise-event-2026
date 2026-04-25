import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Shield, Activity, ChevronRight, Lock, Command, AlertCircle } from 'lucide-react';
import { TacticalStatus } from './TacticalStatus';
import { QuestLogo } from './QuestLogo';

interface LoginScreenProps {
  role: string;
  teamName: string;
  password: string;
  loginError: string | null;
  onTeamNameChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onLogin: () => void;
  onAdminClick: () => void;
  isLoggingIn?: boolean;
}

export function LoginScreen({
  role,
  teamName,
  password,
  loginError,
  onTeamNameChange,
  onPasswordChange,
  onLogin,
  onAdminClick,
  isLoggingIn = false,
}: LoginScreenProps) {
  return (
    <div className="relative min-h-screen overflow-hidden select-none font-sans text-white flex flex-col justify-between">

      {/* TOP BAR */}
      <div className="relative z-10 p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <QuestLogo className="w-10 h-10" />
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-2 h-2 bg-[var(--color-accent)]"
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-accent)]">
              PROTOCOL: AUTHENTICATION_REQUIRED
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-between px-8 md:px-20 py-12">
        {/* LEFT SECTION: TITLES */}
        <div className="w-full md:w-auto mb-12 md:mb-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="font-orbitron text-[80px] md:text-[120px] font-black uppercase leading-[0.8] tracking-tighter mb-2 opacity-95">
              {role.toUpperCase()}
            </h1>
            <h2 className="font-orbitron text-[60px] md:text-[80px] font-black uppercase leading-[0.8] tracking-tighter opacity-[0.15]">
              PROTOCOL
            </h2>
          </motion.div>
        </div>

        {/* RIGHT SECTION: LOGIN CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-[460px] relative"
        >
          <div className="glass-morphism px-11 py-10 rounded-none [clip-path:var(--clip-edges)] shadow-2xl border-l border-[var(--color-accent)]/30">
            <div className="space-y-8">
              {/* Team Name Input */}
              <div className="space-y-2.5">
                <label className="block font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
                  IDENTITY_BUFFER
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => onTeamNameChange(e.target.value)}
                  placeholder="UNIDENTIFIED_UNIT"
                  className="w-full high-clearance-input p-4"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2.5">
                <label className="block font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
                  ACCESS_KEY
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onLogin()}
                  placeholder="********"
                  className="w-full high-clearance-input p-4"
                />
              </div>

              {loginError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center w-full"
                >
                  <TacticalStatus
                    tone="error"
                    label="Auth Error"
                    message={loginError}
                    icon={AlertCircle}
                    className="w-full"
                  />
                </motion.div>
              )}

              {/* Login Button */}
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="group relative w-full py-4 border-y border-[var(--color-accent)]/50 hover:bg-[var(--color-accent)]/5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 font-mono text-[13px] uppercase tracking-[0.3em] text-[var(--color-accent)] group-hover:text-white">
                  {isLoggingIn ? 'AUTHORIZING...' : 'AUTHORIZE ACCESS'}
                </span>
                <div className="absolute inset-0 bg-[var(--color-accent)]/0 group-hover:bg-[var(--color-accent)]/5 transition-colors" />
              </button>

              {/* Disclaimer */}
              <p className="font-mono text-[9px] text-white/40 text-center uppercase tracking-[0.1em] leading-relaxed">
                VERIFICATION MODULE ENGAGED. UNAUTHORIZED ACCESS ATTEMPTS ARE LOGGED.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* BOTTOM STATUS BAR */}
      <div className="relative z-10 p-6 flex items-center justify-between">
        <div className="font-mono text-[11px] text-[var(--color-accent)] opacity-80 tracking-widest flex items-center gap-2">
          NODE: TERMINAL_001 / LATENCY: 24MS
        </div>

        <button
          onClick={onAdminClick}
          className="font-mono text-[11px] text-[var(--color-accent)] opacity-60 hover:opacity-100 tracking-widest transition-all px-4 py-2 hover:bg-[var(--color-accent)]/5 rounded-none"
        >
          [ BYPASS_LINK ]
        </button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scanline {
          from { background-position: 0 0; }
          to { background-position: 0 100%; }
        }
        ::selection {
          background: var(--color-accent);
          color: white;
        }
        ::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
