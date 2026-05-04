import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface GameTimerProps {
  startTime: string | null;
  finishTime: string | null;
  paused?: boolean;
  pausedAt?: string | null;
}

export function GameTimer({ startTime, finishTime, paused = false, pausedAt = null }: GameTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }

    const start = new Date(startTime).getTime();

    if (finishTime) {
      setElapsed(new Date(finishTime).getTime() - start);
      return;
    }

    if (paused) {
      const pausedTime = pausedAt ? new Date(pausedAt).getTime() : Date.now();
      setElapsed(pausedTime - start);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 1000);

    // Initial setting to avoid 1s lag
    setElapsed(Date.now() - start);

    return () => clearInterval(interval);
  }, [startTime, finishTime, paused, pausedAt]);

  const totalSeconds = Math.max(0, Math.floor(elapsed / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedHours = hours.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');
  const paddedSeconds = seconds.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 glass-morphism min-w-[96px] sm:min-w-[120px] justify-center relative overflow-hidden group rounded-full">
      <div className="absolute inset-0 bg-[var(--color-accent)]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <Clock className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${finishTime ? 'text-white' : 'text-[var(--color-accent)]'}`} />
      <span className={`font-mono text-xs sm:text-sm tracking-[0.08em] sm:tracking-widest ${finishTime ? 'text-white font-bold' : 'text-[var(--color-accent)]'}`}>
        {paddedHours}:{paddedMinutes}:{paddedSeconds}
      </span>
      {finishTime && (
        <span className="absolute right-1 top-1 flex h-1.5 w-1.5">
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-accent)]"></span>
        </span>
      )}
    </div>
  );
}
