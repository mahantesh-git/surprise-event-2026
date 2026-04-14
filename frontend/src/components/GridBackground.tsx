/**
 * GridBackground Component
 * Sutéra Design System - Fixed grid overlay with ambient glow
 * Responsive breakpoints for different grid densities
 */

export function GridBackground() {
  return (
    <>
      <div 
        className="ambient-orb"
        role="presentation"
        aria-hidden="true"
        style={{ top: '-10%', left: '-10%' }}
      />
      <div 
        className="ambient-orb"
        role="presentation"
        aria-hidden="true"
        style={{ bottom: '-10%', right: '-10%' }}
      />
    </>
  );
}
