import React from 'react';
import { cn } from '@/lib/utils';
import { QrCode, MapPin, Activity, Shield } from 'lucide-react';

interface TacticalProgressBarProps {
  stage: string;
}

export const TacticalProgressBar = ({ stage }: { stage: string }) => {
  console.log('[TacticalProgress] Rendering for stage:', stage);
  const steps = [
    { id: 1, label: 'Deployment', desc: 'Passkey Authentication', icon: QrCode },
    { id: 2, label: 'Insertion', desc: 'Infiltration / Scanning', icon: MapPin },
    { id: 3, label: 'Extraction', desc: 'Data Puzzle Solving', icon: Activity },
    { id: 4, label: 'Handoff', desc: 'Secure Handshake', icon: Shield },
  ];

  const getStatus = (stepId: number) => {
    const s = stage as string;
    
    // Step 1: Deployment (Solver Handed Off -> Runner is Traveling)
    if (stepId === 1) {
      if (['p1_solve', 'p1_solved'].includes(s)) return 'pending';
      if (s === 'runner_travel') return 'active';
      return 'completed';
    }
    
    // Step 2: Insertion (Runner Scanned Node -> Entering Passkey)
    if (stepId === 2) {
      if (['p1_solve', 'p1_solved', 'runner_travel'].includes(s)) return 'pending';
      if (s === 'runner_game') return 'active';
      return 'completed';
    }
    
    // Step 3: Extraction (Runner is playing the minigame)
    if (stepId === 3) {
      if (['p1_solve', 'p1_solved', 'runner_travel', 'runner_game'].includes(s)) return 'pending';
      if (s === 'runner_game') return 'active';
      return 'completed';
    }
    
    // Step 4: Handoff (Runner finished puzzle -> Ready to sync)
    if (stepId === 4) {
      if (s === 'runner_done') return 'active';
      if (['final_qr', 'complete'].includes(s)) return 'completed';
      return 'pending';
    }
    
    return 'pending';
  };

  return (
    <div className="w-full bg-black/40 border border-white/5  relative overflow-hidden my-4">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
      
      <div className="py-8 px-6 md:px-12 flex justify-between items-start relative max-w-4xl mx-auto">
        {/* Connecting Line */}
        <div className="absolute top-[52px] left-16 right-16 h-[1px] bg-white/10 -z-0" />
        
        {steps.map((step, idx) => {
          const status = getStatus(step.id);
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group flex-1">
              {/* Point Indicator */}
              <div 
                className={cn("w-12 h-12 flex items-center justify-center transition-all duration-700 border",
                  status === 'completed' ?"bg-[var(--color-accent)] border-[var(--color-accent)] shadow-[0_0_25px_var(--color-accent)]" :
                  status === 'active' ?"bg-black border-[var(--color-accent)] animate-pulse shadow-[0_0_15px_rgba(217,31,64,0.3)]" :"bg-black/60 border-white/20"
                )}
                style={{ clipPath: 'var(--clip-oct)' }}
              >
                <Icon className={cn("w-5 h-5",
                  status === 'completed' ?"text-white" :
                  status === 'active' ?"text-[var(--color-accent)]" :"text-white/20"
                )} />
              </div>
              
              {/* Label */}
              <div className="mt-4 text-center">
                <span className={cn("block font-heading text-[10px] tracking-[0.2em] uppercase font-bold whitespace-nowrap",
                  status === 'completed' ?"text-white" :
                  status === 'active' ?"text-[var(--color-accent)]" :"text-white/30"
                )}>{step.label}</span>
                <span className="block font-mono text-[8px] opacity-40 uppercase mt-1 hidden lg:block">{step.desc}</span>
              </div>

              {/* Progress Line Filler */}
              {idx < steps.length - 1 && (
                <div className={cn("absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-[1px] -z-10",
                  status === 'completed' ?"bg-[var(--color-accent)]" :"bg-white/5"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
