import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SwapConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function SwapConfirmModal({ isOpen, onClose, onConfirm, isLoading }: SwapConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isLoading ? onClose : undefined}
            className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative w-full max-w-lg glass-morphism overflow-hidden border border-white/10 shadow-2xl"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-white/20" />
            
            <div className="p-10">
              <div className="mb-8">
                <h3 className="text-2xl font-black uppercase tracking-[0.25em] text-white mb-2">Protocol Warning</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-bold">Manual Overwrite Required</p>
              </div>

              <div className="space-y-6">
                <div className="bg-white/[0.03] border border-white/10 p-6">
                  <p className="text-xs text-white/70 uppercase tracking-widest leading-relaxed font-bold">
                    WARNING: Burning a swap will replace the current mission with a reserve data packet.
                  </p>
                </div>
                
                <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] leading-loose font-medium">
                  This action is irreversible. All current mission progress will be terminated.
                </p>
              </div>

              <div className="mt-10 flex flex-col gap-3">
                <Button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="h-14 bg-white text-black hover:bg-white/90 border-none uppercase tracking-[0.3em] font-black text-xs transition-all"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    "Execute Reconfiguration"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={isLoading}
                  className="h-12 text-white/40 hover:text-white hover:bg-white/5 uppercase tracking-[0.3em] font-black text-[10px] transition-all"
                >
                  Abort Operation
                </Button>
              </div>
            </div>

            <div className="bg-white/5 px-10 py-4 flex justify-between items-center">
              <span className="text-[8px] text-white/20 uppercase tracking-[0.4em] font-black">Secure Link Verified</span>
              <span className="text-[8px] text-white/20 uppercase tracking-[0.4em] font-black">ID: CONFIRM_SWAP</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
