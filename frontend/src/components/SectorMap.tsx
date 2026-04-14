import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { RoundQuestion } from '@/lib/api';

interface SectorMapProps {
  rounds: RoundQuestion[];
  currentRound: number;
  roundsDone: boolean[];
  stage: string;
}

export function SectorMap({ rounds, currentRound, roundsDone, stage }: SectorMapProps) {
  const isComplete = stage === 'complete';

  return (
    <div className="space-y-4">
      <div className="relative aspect-[2/1] w-full border border-white/10 bg-[#15171A] corner-card p-4 overflow-hidden">
        <svg viewBox="0 0 1000 500" className="w-full h-full">
          {/* Connection Lines */}
          {rounds.map((round, i) => {
            if (i === 0) return null;
            const prev = rounds[i - 1];
            const isPathActive = roundsDone[i - 1];

            return (
              <line
                key={`line-${i}`}
                x1={prev.cx * 1000}
                y1={prev.cy * 500}
                x2={round.cx * 1000}
                y2={round.cy * 500}
                stroke={isPathActive ? '#95FF00' : 'rgba(255,255,255,0.05)'}
                strokeWidth="2"
                strokeDasharray={isPathActive ? "0" : "5,5"}
                className="transition-all duration-1000"
              />
            );
          })}

          {/* Nodes */}
          {rounds.map((round, i) => {
            const isDone = roundsDone[i];
            const isActive = i === currentRound && !isComplete;
            const isTarget = i === currentRound + 1 && !isComplete;
            const isLocked = i > currentRound + 1 && !isComplete;

            const x = round.cx * 1000;
            const y = round.cy * 500;

            return (
              <g key={`node-${i}`} className="cursor-help">
                {/* Active Pulse Ring */}
                {isActive && (
                  <circle
                    cx={x}
                    cy={y}
                    r="20"
                    fill="none"
                    stroke="#95FF00"
                    strokeWidth="2"
                    className="animate-ping opacity-25"
                  />
                )}

                {/* Double Ring for Current */}
                {isActive && (
                  <circle
                    cx={x}
                    cy={y}
                    r="14"
                    fill="none"
                    stroke="#95FF00"
                    strokeWidth="1.5"
                  />
                )}

                {/* Main Node */}
                <circle
                  cx={x}
                  cy={y}
                  r={isDone ? 8 : 6}
                  fill={isDone ? "#95FF00" : (isActive ? "#95FF00" : (isTarget ? "rgba(255,255,255,0.4)" : "#333333"))}
                  className="transition-all duration-500"
                />

                {/* Label */}
                <text
                  x={x}
                  y={y + 25}
                  fill={isActive ? "#95FF00" : "rgba(255,255,255,0.3)"}
                  fontSize="12"
                  textAnchor="middle"
                  className="font-mono uppercase tracking-widest pointer-events-none"
                >
                  {round.coord.place.split(',')[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-8 py-3 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#95FF00]" />
          <span className="label-technical !text-white/40">Secured</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border border-[#95FF00] flex items-center justify-center">
             <div className="w-1.5 h-1.5 rounded-full bg-[#95FF00]" />
          </div>
          <span className="label-technical !text-[#95FF00]">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/10" />
          <span className="label-technical !text-white/20">Locked</span>
        </div>
      </div>
    </div>
  );
}
