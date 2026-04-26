import React from 'react';
import { RainEffect } from './RainEffect';

export function TacticalBackground() {
  const bgUrl = import.meta.env.VITE_BACKGROUND_IMAGE_URL || '/assets/images/cyberpunk-city-2.jpg';
  return (
    <div className="fixed inset-0 z-0 bg-[#0a0200] overflow-hidden pointer-events-none">
      {/* ATMOSPHERIC BACKGROUND */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[#0a0200]" />

        {/* The generated high-fidelity background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'contrast(1.2) brightness(1.1)'
          }}
        />

        {/* Deep atmospheric dark vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(10,2,0,0.9)_100%)]" />

        {/* Grain / Noise Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />

        {/* Scanline Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-[0.05]" />
      </div>

      <RainEffect />
    </div>
  );
}
