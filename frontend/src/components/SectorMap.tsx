import React from 'react';
import { RoundQuestion } from '@/lib/api';

interface SectorMapProps {
  rounds: RoundQuestion[];
  currentRound: number;
  roundsDone: boolean[];
  stage: string;
}

export function SectorMap({ rounds, currentRound, stage }: SectorMapProps) {
  const isComplete = stage === 'complete';
  const isRunnerStage = ['p2_travel', 'p2_scan', 'p2_solve', 'p2_solved'].includes(stage);
  const visibleRoundIndex = isRunnerStage ? currentRound : currentRound - 1;
  const current = visibleRoundIndex >= 0 ? rounds?.[Math.min(visibleRoundIndex, rounds.length - 1)] : null;

  // Create a clean coordinate query if data exists, otherwise fallback to the campus
  const getQuery = () => {
    if (current && current.coord && current.coord.lat && current.coord.lng && !isComplete) {
      // Remove symbols like ° but keep N/E/S/W for reliable parsing by Google Maps
      const lat = current.coord.lat.replace('°', '');
      const lng = current.coord.lng.replace('°', '');
      return `${lat}, ${lng}`;
    }
    return "KLE'S BCA, J.T College , GADAG";
  };

  const query = getQuery();

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] w-full border border-[#95FF00]/20 bg-[#15171A] corner-card overflow-hidden">
        {/* Using a clean invert + hue-rotate to create a dark-theme map that preserves buildings and streets */}
        <iframe
          title="Sector Map"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=m&z=20&ie=UTF8&iwloc=&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0, minHeight: '300px' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 w-full h-full invert hue-rotate-180 opacity-90 transition-opacity duration-1000"
        />
        {/* Subtle Tech-noir tint overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[#95FF00]/5 mix-blend-color" />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-8 py-3 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-2">
          {isRunnerStage ? (
            <>
              <div className="w-3 h-3 rounded-full border border-[#95FF00] flex items-center justify-center">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#95FF00] animate-pulse" />
              </div>
              <span className="label-technical !text-[#95FF00]">Target Location Active</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-full border border-yellow-500/50 flex items-center justify-center">
                 <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50 animate-pulse" />
              </div>
              <span className="label-technical text-yellow-500/80">Awaiting Target Coordinates</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
