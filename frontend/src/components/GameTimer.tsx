import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface GameTimerProps {
  startTime: string | null;
  finishTime: string | null;
}

export function GameTimer({ startTime, finishTime }: GameTimerProps) {
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

    const interval = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 1000);

    // Initial setting to avoid 1s lag
    setElapsed(Date.now() - start);

    return () => clearInterval(interval);
  }, [startTime, finishTime]);

  const totalSeconds = Math.max(0, Math.floor(elapsed / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedHours = hours.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');
  const paddedSeconds = seconds.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border border-[#95FF00]/20 bg-[#95FF00]/5 backdrop-blur-sm min-w-[120px] justify-center relative overflow-hidden group">
      <div className="absolute inset-0 bg-[#95FF00]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <Clock className={`w-3.5 h-3.5 ${finishTime ? 'text-white' : 'text-[#95FF00]'}`} />
      <span className={`font-mono text-sm tracking-widest ${finishTime ? 'text-white font-bold' : 'text-[#95FF00]'}`}>
        {paddedHours}:{paddedMinutes}:{paddedSeconds}
      </span>
      {finishTime && (
        <span className="absolute right-1 top-1 flex h-1.5 w-1.5">
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#95FF00]"></span>
        </span>
      )}
    </div>
  );
}
