import React from 'react';

export const RainEffect = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
      <style>
        {`
          @keyframes rain {
            0% { transform: translateY(-120px) skewX(-15deg); }
            100% { transform: translateY(100vh) skewX(-15deg); }
          }
        `}
      </style>
      {[...Array(60)].map((_, i) => (
        <div
          key={i}
          className="absolute bg-gradient-to-b from-transparent via-white/40 to-transparent w-[1px] h-[80px]"
          style={{
            left: `${Math.random() * 120 - 10}%`,
            top: `-100px`,
            animation: `rain ${0.6 + Math.random() * 0.4}s linear infinite`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: 0.1 + Math.random() * 0.4,
          }}
        />
      ))}
    </div>
  );
};
