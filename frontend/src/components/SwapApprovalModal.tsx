import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

interface SwapApprovalModalProps {
  isOpen: boolean;
  requesterRole: string | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function SwapApprovalModal({ isOpen, requesterRole, onAccept, onDecline }: SwapApprovalModalProps) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(60);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline(); // Auto-decline on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onDecline]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative w-full max-w-lg glass-morphism overflow-hidden border border-[var(--color-accent)]/20 shadow-2xl"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-red-500/40" />
            
            <div className="p-10">
              <div className="mb-8 flex items-center gap-4">
                <ShieldAlert className="w-10 h-10 text-red-500 animate-pulse" />
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-[0.25em] text-white mb-2">Authorization Requested</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-bold">Action: Burn Swap</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-red-500/[0.03] border border-red-500/10 p-6">
                  <p className="text-xs text-white/70 uppercase tracking-widest leading-relaxed font-bold">
                    Your teammate ({requesterRole?.toUpperCase()}) wants to use a Burn Swap. This will replace the current mission with a reserve data packet.
                  </p>
                </div>
                
                <p className="text-[11px] text-red-400 uppercase tracking-[0.3em] leading-loose font-black flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Time remaining to authorize: {timeLeft}s
                </p>
              </div>

              <div className="mt-10 flex flex-col gap-3">
                <Button
                  onClick={onAccept}
                  className="h-14 bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent)]/90 border-none uppercase tracking-[0.3em] font-black text-xs transition-all"
                >
                  Accept & Execute Swap
                </Button>
                <Button
                  variant="ghost"
                  onClick={onDecline}
                  className="h-12 text-white/40 hover:text-white hover:bg-white/5 border border-white/10 uppercase tracking-[0.3em] font-black text-[10px] transition-all"
                >
                  Decline Request
                </Button>
              </div>
            </div>

            <div className="bg-black/40 px-10 py-4 flex justify-between items-center border-t border-white/5">
              <span className="text-[8px] text-white/20 uppercase tracking-[0.4em] font-black">Auth Level Required</span>
              <span className="text-[8px] text-white/20 uppercase tracking-[0.4em] font-black">ID: TEAM_SYNC</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
