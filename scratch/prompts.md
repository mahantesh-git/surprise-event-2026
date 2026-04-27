You are an expert frontend developer specialising in responsive React + TypeScript applications with Framer Motion and Tailwind CSS.
I have a React 18 + Vite + TypeScript web application called QUEST: The Code Scavenger — a real-time tactical scavenger hunt platform with a dark HUD aesthetic using glassmorphism, scanlines, and Orbitron typography.
Your job is to make the entire application fully responsive across all devices — mobile (360px–428px), tablet (768px–1024px), and desktop (1280px+).

Current tech stack:

React 18 + Vite + TypeScript
Framer Motion for animations
Tailwind CSS for styling
Leaflet.js for maps
Socket.IO for real-time sync
Orbitron font from Google Fonts


Key screens to fix:
1. Solver screen (desktop/laptop)

Code editor must be fully usable on tablet
Puzzle text must be readable at all sizes
Passkey display must not overflow on small screens
Action buttons must be full width on mobile

2. Runner screen (mobile-primary)

This is the most critical — Runners use phones exclusively
Sector map must fill the screen properly on all phone sizes (360px to 428px wide)
Mini-games (Target Lock, Neural Decode, Cipher Crack) must be touch-optimised
Target Lock: tap target must be large enough to hit on a small phone screen
Neural Decode: card grid must scale — 3x4 on mobile, can expand on tablet
Cipher Crack: 2x2 color blocks must fill the screen comfortably
GPS coordinates and HUD elements must not overlap or clip
Lockdown mode screen must center correctly on all phone sizes

3. Leaderboard

Table must collapse gracefully on mobile — consider card layout instead of table rows on small screens
Points breakdown must be readable without horizontal scroll
Live update animations must not cause layout shift on mobile

4. Admin panel

Functional on tablet minimum
Discord bridge controls must be accessible on smaller screens


Responsive rules to apply globally:

Use clamp() for font sizes throughout — never fixed px sizes on text
All tap targets minimum 44x44px (Apple HIG standard) — critical for mini-games
No horizontal scroll on any screen at any breakpoint
Safe area insets for notched phones: env(safe-area-inset-*) on fixed elements
Leaflet map container must have explicit height — never height: 100% without a parent height set
Use dvh (dynamic viewport height) instead of vh to handle mobile browser chrome correctly
All modals and overlays must be scrollable on small screens
Touch events (onTouchStart, onTouchEnd) alongside click events for all interactive elements
Framer Motion animations must respect prefers-reduced-motion media query


Breakpoints to use (Tailwind):
sm: 360px   // small phones
md: 768px   // tablets
lg: 1024px  // large tablets / small laptops
xl: 1280px  // desktop

Specific fixes needed:
- Replace all fixed width/height values with responsive equivalents
- Replace vh units with dvh on full-screen containers
- Add touch-action: manipulation to all tappable game elements
- Wrap all page-level components in a max-w-screen-xl mx-auto container
- Add overflow-x-hidden to the root layout
- Ensure Leaflet map resizes correctly on orientation change using map.invalidateSize()
- Add orientationchange event listener that triggers map refresh
- Mini-game canvases must use ResizeObserver to redraw on container size change
- Passkey input fields must not trigger zoom on iOS (font-size minimum 16px on inputs)
- Prevent double-tap zoom on game elements with touch-action: manipulation

Output format:
Go file by file. For each file:

Show what the problem is
Show the fixed code
Explain what changed and why

Start with the global layout and root styles, then move to Runner screen (highest priority), then Solver screen, then Leaderboard, then Admin panel.