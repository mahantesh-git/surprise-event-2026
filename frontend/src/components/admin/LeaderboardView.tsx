import { Leaderboard } from '@/components/Leaderboard';

export function LeaderboardView() {
  return (
    <div className="h-full relative overflow-hidden glass-morphism rounded-none border-0">
      <div className="absolute inset-0 z-0">
        <Leaderboard />
      </div>


      <div className="absolute bottom-6 right-6 z-10 pointer-events-none">
        <div className="px-4 py-2 glass-morphism border-r-2 border-[var(--color-accent)] text-right">
          <div className="text-[8px] font-mono text-white/70 uppercase tracking-[0.2em]">Sync_Status</div>
          <div className="text-[10px] font-mono text-[var(--color-accent)] uppercase tracking-[0.3em]">Link_Established</div>
        </div>
      </div>
    </div>
  );
}
