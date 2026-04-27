import React from 'react';

export function QuestLogo({ className ="w-12 h-12" }: { className?: string }) {
  return (
    <div className={`relative ${className} group`}>
      {/* Outer Glow */}
      <div className="absolute inset-0 bg-[var(--color-accent)] opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />

      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_0_8px_rgba(217,31,64,0.5)]"
      >
        {/* Stylized Q Body */}
        <path
          d="M50 15C30.67 15 15 30.67 15 50C15 69.33 30.67 85 50 85C56.5 85 62.5 83.2 67.7 80.1L85 92.5L92.5 85L80.1 67.7C83.2 62.5 85 56.5 85 50C85 30.67 69.33 15 50 15ZM50 72C37.85 72 28 62.15 28 50C28 37.85 37.85 28 50 28C62.15 28 72 37.85 72 50C72 62.15 62.15 72 50 72Z"
          fill="white"
          className="group-hover:fill-[var(--color-accent)] transition-colors duration-500"
        />

        {/* Tactical Crosshair Lines */}
        <line x1="50" y1="5" x2="50" y2="22" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
        <line x1="50" y1="78" x2="50" y2="95" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
        <line x1="5" y1="50" x2="22" y2="50" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
        <line x1="78" y1="50" x2="95" y2="50" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />

        {/* Coding Brackets */}
        <path
          d="M38 42L32 50L38 58"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="group-hover:translate-x-[-2px] transition-transform"
        />
        <path
          d="M62 42L68 50L62 58"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="group-hover:translate-x-[2px] transition-transform"
        />

        {/* Inner Glitch Square */}
        <rect
          x="46"
          y="46"
          width="8"
          height="8"
          fill="var(--color-accent)"
          className="animate-[pulse_2s_infinite]"
        />
      </svg>

      {/* HUD Corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--color-accent)] opacity-50" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[var(--color-accent)] opacity-50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[var(--color-accent)] opacity-50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--color-accent)] opacity-50" />
    </div>
  );
}
