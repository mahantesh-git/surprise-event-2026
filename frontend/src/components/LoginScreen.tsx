import React from 'react';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GridBackground } from './GridBackground';
import { cn } from '@/lib/utils';

interface LoginScreenProps {
  role: string;
  teamName: string;
  password: string;
  loginError: string | null;
  onTeamNameChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onLogin: () => void;
  onAdminClick: () => void;
}

/** LineMask — per-line reveal */
function LineMask({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div style={{ overflow: 'hidden' }}>
      <motion.div
        initial={{ translateY: '105%' }}
        animate={{ translateY: '0%' }}
        transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * LoginScreen — extracted from App.tsx.
 * Editorial two-block layout: large role label (top) + compact form (bottom).
 */
export function LoginScreen({
  role,
  teamName,
  password,
  loginError,
  onTeamNameChange,
  onPasswordChange,
  onLogin,
  onAdminClick,
}: LoginScreenProps) {
  return (
    <div className="relative min-h-screen bg-[#15171A] text-white overflow-hidden flex flex-col justify-between p-8 md:p-16">
      <GridBackground />

      {/* Top Section */}
      <div className="relative z-10">
        <LineMask delay={0.05}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 bg-[#95FF00] animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#95FF00]/80">
              Protocol: Authentication_Required
            </p>
          </div>
        </LineMask>

        <h1 className="text-[clamp(48px,12vw,120px)] font-bold uppercase tracking-tighter leading-[0.85] flex flex-col font-space-grotesk">
          {[role.toUpperCase(), 'PROTOCOL'].map((word, i) => (
            <LineMask key={word} delay={0.1 + i * 0.1}>
              <span className={cn(i === 0 ? "text-white" : "text-white/10")}>{word}</span>
            </LineMask>
          ))}
        </h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="h-[1px] bg-[#95FF00]/30 mt-12 origin-left scale-x-100 w-32"
        />
      </div>

      {/* Middle Section - Form Card */}
      <div className="flex-1 flex items-center justify-center relative z-10 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="corner-card w-full max-w-md bg-black/40 backdrop-blur-xl p-10 border border-white/5 relative"
        >
          <div className="corner-br" /> <div className="corner-bl" />

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-mono text-[9px] uppercase tracking-widest text-white/40 ml-1">Identity_Buffer</label>
                <Input
                  placeholder="Team Identifier..."
                  value={teamName}
                  onChange={e => onTeamNameChange(e.target.value)}
                  className="rounded-none border-white/10 bg-black/20 text-white font-mono placeholder:text-white/10 h-12 focus:border-[#95FF00]/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[9px] uppercase tracking-widest text-white/40 ml-1">Access_Key</label>
                <Input
                  placeholder="Passcode..."
                  type="password"
                  value={password}
                  onChange={e => onPasswordChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onLogin()}
                  className="rounded-none border-white/10 bg-black/20 text-white font-mono placeholder:text-white/10 h-12 focus:border-[#95FF00]/50 transition-all"
                />
              </div>
            </div>

            {loginError && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="border-l-2 border-rose-600 bg-rose-600/10 p-3 text-[10px] uppercase tracking-widest text-rose-400 font-mono"
              >
                Error: {loginError}
              </motion.div>
            )}

            <Button
              onClick={onLogin}
              className="w-full h-14 bg-[#95FF00] hover:bg-[#85e600] text-black font-bold uppercase tracking-[0.3em] rounded-none transition-all group relative overflow-hidden"
            >
              <span className="relative z-10">Authorize Access</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>

            <p className="font-mono text-[9px] text-white/20 text-center uppercase tracking-widest leading-relaxed">
              * Verification module engaged. Unauthorized access attempts are logged.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="relative z-10 flex items-center justify-between border-t border-white/5 pt-8"
      >
        <div className="flex items-center gap-3">
          <Zap size={14} className="text-[#95FF00] animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            Node: Terminal_001 <span className="text-white/20 mx-1">/</span> Latency: 24ms
          </span>
        </div>

        <button
          onClick={onAdminClick}
          className="font-mono text-[10px] text-white/40 hover:text-[#95FF00] uppercase tracking-[0.2em] transition-colors flex items-center gap-2"
        >
          [ Bypass_Link ]
        </button>
      </motion.div>
    </div>
  );
}
