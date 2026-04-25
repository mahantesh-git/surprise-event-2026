EV2 (Earth Version 2) — Complete UI/UX Design System Audit

1. Visual Identity & Brand Feel
Overall Mood: Sci-fi futuristic / dark cinematic / AAA game marketing
Brand Personality:

Aggressive yet sophisticated — the visual language communicates urgency and power
Draws from the aesthetic vocabulary of games like Destiny, Warframe, and Cyberpunk marketing sites
Combines military-tactical precision with cosmic/alien mysticism
The brand feels "earned" — like premium game studio output, not indie

Emotional Tone Conveyed:

Tension, anticipation, and heroic urgency
The deep space darkness creates existential weight
Red accents pulse with danger and action
Motion elements (video backgrounds, particle effects labeled "meteors") suggest a living, breathing world
The overall experience says: "This is serious entertainment with real stakes"


2. Color System
Primary Colors:

#100F2C — Deep navy/space black (dominant background and text)
#D91F40 — Crimson red (primary CTA, accent, logo highlight)

Secondary/Supporting Colors:

#FFFFFF — Pure white (headings, body text on dark backgrounds)
Muted off-whites for secondary text (approximately #B0B0C0)
Dark charcoal overlays approximately #0A0919

Accent Colors:

Red gradient variants of #D91F40 used in button fills and icon backgrounds
Subtle cool blues/purples implied in the deep space background imagery
White at ~16% opacity for decorative SVG path lines (roadmap curve)

Background Layering Strategy:

Layer 1: Pure deep navy/near-black base
Layer 2: Section-specific background images (planet textures, particle fields, black hole video loop)
Layer 3: Fog/ash overlay elements for depth blending between sections
Layer 4: Content containers with semi-transparent or subtle surface treatments
This creates genuine perceived depth — sections feel like different atmospheric zones

Light vs Dark Balance:

Heavily dark-dominant (approximately 85% dark, 15% light surface area)
Light elements are used surgically for hierarchy — never decoratively without purpose

Gradient Usage:

Gradients appear on button clip-icon elements (gradient class applied to small navigation arrows)
Section backgrounds blend via fog and ash overlay divs — soft opacity fade transitions rather than hard CSS gradients
The roadmap SVG line uses white at 16% opacity for a ghosted trail effect

Contrast Ratio Quality:

White text on #100F2C exceeds WCAG AA standards comfortably
Red (#D91F40) on dark backgrounds is high contrast for large elements but would fail for small body text — used appropriately only for buttons and accents
Overall contrast discipline is strong for a gaming context


3. Typography System
Font Categories:

Orbitron — geometric sans-serif, futuristic, used for UI labels and subtitles (evidenced by class names orbitro-24, orbitro-14)
Primary heading font — appears to be a condensed or slightly editorial sans-serif for section titles
Body copy uses a clean, readable humanist sans-serif

Heading Style and Hierarchy:

H1 equivalent: Large, bold, often two-line with a <br> break for dramatic pacing ("Suit up and / save the future")
Section titles use section-title--large and section-title--small variants — a two-level heading scale
Uptitles/labels (like "Take a look") use Orbitron in small caps at reduced size — acting as eyebrow text
Strong reliance on SIZE contrast rather than weight contrast for hierarchy

Font Weight Usage:

Heavy weights (700–900) exclusively for headlines
Regular weight (400) for body paragraphs
Medium (500–600) for UI elements and button labels

Line Height and Spacing Patterns:

Headings: tight leading (approximately 1.1–1.2) — creates monolithic block feel
Body text: comfortable reading leading (approximately 1.6–1.7)
Generous paragraph margins create breathing room between content blocks

Text Density:

Airy — sections are content-sparse by design
Text serves as orienting narrative, not information delivery
Each section contains roughly 1 headline + 2–4 sentences maximum


4. Layout & Grid Structure
Container Width Style:

Dual strategy: container mobile-narrow class suggests a constrained readable width (likely ~1200px max with internal padding)
Some sections break to full-bleed for backgrounds while content remains boxed
Hero and section backgrounds are always full-bleed

Grid System:

No evidence of a strict CSS grid column system — layout is primarily flexbox-based
flex-v (column flex) and flex-h (row flex) utility classes form the layout primitives
Flexbox with flex-c (center alignment) handles centering throughout

Spacing Rhythm:

Appears to follow an 8px base unit system
Section padding is generous — visually estimated at 80–120px vertical padding per section
Component-level spacing follows tighter 8–24px increments

Section Segmentation:

Each section is a distinct "scene" with unique background treatment
Transition elements (.fog, .ash, .meteors, .top-bg) bridge sections visually
9 distinct content sections: Intro, About, Video, Follow/Form, Roadmap, Bundles/Characters, Coalition/Heroes, Game Modes (Planets), Blog

Content Alignment Patterns:

Heroes/coalition section: content text blocks positioned absolutely or offset to align with illustrated character silhouettes
Most content sections: center-aligned or left-aligned within container
Roadmap: dual-column (timeline left + info right)

Visual Hierarchy Structure:

Eyebrow label → Large heading → Body paragraph → CTA button
This 4-tier hierarchy repeats consistently across sections, creating rhythmic scanability


5. Component Breakdown
Navbar Design:

Not a traditional navbar — the intro section contains only the logo mark (SVG)
Navigation appears to be minimal/hidden or scroll-triggered — the design prioritizes immersion over navigation utility
Footer contains the actual navigation links (Terms, Privacy)

Hero Section Composition:

Full-viewport, video/canvas background with preloader overlay
Logo centered vertically with large italic subtitle beneath
Single CTA button with custom hexagonal clip-path shape
Percentage-based loading indicator suggests a theatrical entrance experience

Buttons:

Signature style: custom btn-clip polygon shape — NOT standard rounded rectangles
The button path creates a hexagonal/faceted outline that matches the game's UI aesthetic
Variants: btn--red (filled crimson), btn--dark (dark fill), btn--large
Icon buttons: small clip-path diamonds with arrow or play icons inside
"Coming soon" buttons are visually identical to active buttons but functionally disabled — maintaining visual consistency
No border-radius buttons — everything is angular and geometric

Cards (Blog/News):

Flat cards with image top, content below
Thin border or no border — the image does the visual lifting
Small hexagonal icon badge in card content area
Date + title + description hierarchy within card
Cards are anchor elements — entire card is clickable

Forms & Inputs:

Single email input in the "Follow us" section
Clean underline or minimal border style (implied by the dark section context)
Label positioned above input
Submit button uses the same hexagonal clip-path treatment as all other CTAs
Video background (black-hole.mp4) adds dramatic context to the form section

Footer Structure:

Horizontal flex layout: Logo left, nav links center, copyright right
Custom clip-path applied to the entire footer container (angled top-left cut)
Social icons as CSS mask images (YouTube, Instagram, Twitter, TikTok)
Minimal — 3 columns maximum, no mega-footer pattern

Call-to-Action Patterns:

All CTAs share the hexagonal button shape
Red fill = primary action ("Get Started", "Play", "Watch Full Video")
Dark/gradient fill = secondary action
"Coming soon" state maintains shape but signals unavailability
CTAs are always isolated — never competing buttons side by side


6. Depth, Effects & Visual Enhancements
Shadows:

Minimal traditional box-shadows — depth is achieved through layering and atmospheric effects rather than drop shadows
Character silhouettes have implied depth through the contrast between SVG fill and background

Border Radius System:

Essentially zero border radius across the entire system
All shapes are angular — buttons, cards, clips are polygon-based
This is a deliberate anti-rounded aesthetic — angularity = military/tech precision

Glassmorphism or Neumorphism:

Neither — the design predates or deliberately avoids both trends
Uses atmospheric depth (fog overlays, video backgrounds) rather than surface blur effects

Glow or Highlight Effects:

Implied through the video backgrounds and planet imagery
SVG roadmap points have a stroke--progress path suggesting animated glow/fill states
Red elements carry inherent luminosity against the dark backgrounds

Iconography Style:

Custom SVG icons throughout — no icon library (no Feather, Heroicons, etc.)
The blog card icon is a custom hexagonal frame with document lines inside
Button icons (play arrow, navigation arrows) are geometric and minimal
All iconography maintains the polygon/faceted aesthetic language

Illustration or Photography Style:

Character art: full-body armored suit illustrations in SVG polygon outline style — highly stylized, not photorealistic
These SVG characters are interactive (hover masks defined in the SVG data)
Blog imagery: photographic game screenshots
Planet sections: photographic space/terrain imagery with section clip-path masks applied
The SVG character system is the most distinctive visual element of the entire site


7. Interaction & Animation Style
Hover Effects:

Character hero SVGs have data-mask="hover" polygon paths — suggest highlight/reveal on hover
Buttons likely scale or brighten on hover
Card links presumably have image zoom or overlay transitions
Roadmap points have three stroke states: static, progress, and center — suggesting animated state changes

Scroll Animations:

The meteor/particle field in the About section suggests scroll-triggered particle animation
Section backgrounds likely use parallax or fade-in on scroll
Roadmap line has an animated path fill (the path.line element is a fill mask for progress animation)

Microinteractions:

The roadmap navigation (prev/next buttons) cycles through timeline items with associated info panel updates
Character slider uses Swiper.js with clone slides for infinite loop behavior
The video player has custom play/pause state toggle (.video-status with play/pause class switching)
The preloader with percentage counter (0%) is a theatrical microinteraction gating the experience

Transition Smoothness:

Based on the class naming and structure: smooth, deliberate transitions
Not snappy/instant — the cinematic context demands gradual reveals

Motion Personality:

Dramatic and deliberate — every animation serves the narrative
Slow reveals, atmospheric transitions, weighted button interactions
Think film trailer pacing, not SaaS dashboard efficiency


8. Responsiveness Strategy
Mobile Layout Behavior:

mobile-narrow container class suggests tighter padding on mobile
Character coalition section likely stacks vertically on mobile — the 4 heroes would be too wide otherwise
The dual-column roadmap (timeline + info) likely collapses to single column

Navbar Collapse Pattern:

No traditional hamburger menu observed — the minimal navigation means mobile doesn't require collapse logic
Footer links remain accessible without a hamburger

Font Scaling Logic:

orbitro-24 and orbitro-14 suggest pixel-locked sizes rather than fluid typography
Section titles likely use clamp() or viewport units for large headings
Body text stays fixed at comfortable reading sizes

Content Stacking Structure:

Section content (text + visuals) stacks vertically
Character SVGs likely scale proportionally and stack
The planet clip-path sections may simplify — the jagged top mask would be preserved but the section layout simplifies to vertical stack


9. Technical Estimation
Likely Frontend Framework:

Next.js (confirmed by /_next/static/chunks/ paths, BAILOUT_TO_CLIENT_SIDE_RENDERING template, data-nimg Next.js image attributes)
App Router architecture (confirmed by app/page-... and app/layout-... chunk naming)

CSS Methodology:

Custom CSS with utility-style class naming (flex-v, flex-h, flex-c, obj-cover, obj-contain)
NOT Tailwind — the class names are hand-crafted semantically
BEM-influenced naming for component classes (section-title--large, btn-clip-icon, slide-img--main)
Two CSS files suggest a split between global/reset and component styles

Animation Libraries:

Swiper.js — confirmed by swiper, swiper-wrapper, swiper-slide classes in the character carousel
Custom vanilla JS for roadmap interaction, video controls, and preloader
Likely GSAP or custom scroll observers for section reveal animations (not confirmable from HTML alone but strongly implied by the sophistication)

Performance Considerations:

Next.js Image component with multiple srcSet breakpoints (640w through 3840w) — good image optimization
Videos use muted, playsInline, loop — correct autoplay setup
noindex, nofollow meta tags indicate this is a staging environment, not production
The BAILOUT_TO_CLIENT_SIDE_RENDERING tag suggests heavy client-side interactivity that prevents full SSR
SVG character data is inlined — zero additional HTTP requests for illustrations


10. Rebuild Blueprint
Design Principles to Extract

Angular everything — no border-radius, use CSS clip-path for all interactive elements
Atmospheric depth — layer video/image backgrounds with opacity overlays
Restrained color — deep navy + crimson red + white only
Typographic boldness — Orbitron for UI chrome, large weight contrast for headings
Section-as-scene — each section is a standalone visual environment


Plain HTML/CSS Hero Section
html<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>EV2 Hero</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Inter:wght@400;600&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --color-bg: #100F2C;
      --color-red: #D91F40;
      --color-white: #FFFFFF;
      --color-muted: #9090B0;
    }

    body {
      background: var(--color-bg);
      color: var(--color-white);
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
    }

    .hero {
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      text-align: center;
      padding: 2rem;
    }

    .hero__video-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.3;
      z-index: 0;
    }

    .hero__fog {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 200px;
      background: linear-gradient(to top, var(--color-bg), transparent);
      z-index: 1;
    }

    .hero__content {
      position: relative;
      z-index: 2;
      max-width: 700px;
    }

    .hero__logo {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(3rem, 10vw, 6rem);
      font-weight: 900;
      letter-spacing: 0.05em;
      line-height: 1;
      color: var(--color-white);
      margin-bottom: 1.5rem;
    }

    .hero__logo span {
      color: var(--color-red);
    }

    .hero__subtitle {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(1rem, 3vw, 1.5rem);
      font-weight: 700;
      color: var(--color-muted);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-bottom: 3rem;
      line-height: 1.6;
    }

    /* Hexagonal clip-path button */
    .btn-hex {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 2.5rem;
      background: var(--color-red);
      color: var(--color-white);
      font-family: 'Orbitron', sans-serif;
      font-size: 0.875rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-decoration: none;
      border: none;
      cursor: pointer;
      clip-path: polygon(
        0% 15%, 3% 0%, 97% 0%, 100% 15%,
        100% 85%, 97% 100%, 3% 100%, 0% 85%
      );
      transition: background 0.2s ease, transform 0.2s ease;
      position: relative;
    }

    .btn-hex:hover {
      background: #ff2347;
      transform: scale(1.03);
    }

    .btn-hex::before {
      content: '▶';
      font-size: 0.75rem;
    }

    /* Atmospheric particle dots */
    .hero__particles {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
    }

    .particle {
      position: absolute;
      width: 2px;
      height: 2px;
      border-radius: 50%;
      background: rgba(255,255,255,0.4);
      animation: float linear infinite;
    }

    @keyframes float {
      from { transform: translateY(100vh); opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      to { transform: translateY(-20px); opacity: 0; }
    }

    @media (max-width: 640px) {
      .hero__content { padding: 1rem; }
    }
  </style>
</head>
<body>
  <section class="hero">
    <!-- Swap src for actual video asset -->
    <video class="hero__video-bg" autoplay muted loop playsinline>
      <source src="space-bg.mp4" type="video/mp4"/>
    </video>

    <div class="hero__particles" id="particles"></div>
    <div class="hero__fog"></div>

    <div class="hero__content">
      <h1 class="hero__logo">EV<span>2</span></h1>
      <p class="hero__subtitle">Suit up and<br/>save the future</p>
      <a href="#" class="btn-hex">Get Started</a>
    </div>
  </section>

  <script>
    // Generate atmospheric particles
    const container = document.getElementById('particles');
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.animationDuration = (8 + Math.random() * 20) + 's';
      p.style.animationDelay = (Math.random() * 15) + 's';
      p.style.opacity = Math.random() * 0.6;
      p.style.width = p.style.height = (1 + Math.random() * 2) + 'px';
      container.appendChild(p);
    }
  </script>
</body>
</html>

Tailwind CSS Version
jsx// Install: @tailwindcss/forms, tailwindcss
// tailwind.config.js — add custom colors and clipPath plugin

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center 
                 justify-center overflow-hidden text-center px-6"
      style={{ background: '#100F2C' }}
    >
      {/* Video background */}
      <video
        className="absolute inset-0 w-full h-full object-cover opacity-30 z-0"
        autoPlay muted loop playsInline
      >
        <source src="/video/ev2-trailer.mp4" type="video/mp4" />
      </video>

      {/* Bottom fog */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #100F2C, transparent)'
        }}
      />

      {/* Content */}
      <div className="relative z-20 max-w-2xl mx-auto">
        {/* Logo */}
        <h1
          className="font-black tracking-tight leading-none mb-6"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 'clamp(3rem, 12vw, 7rem)',
            color: '#FFFFFF'
          }}
        >
          EV<span style={{ color: '#D91F40' }}>2</span>
        </h1>

        {/* Subtitle */}
        <p
          className="uppercase tracking-widest mb-12 leading-relaxed"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 'clamp(0.875rem, 2.5vw, 1.25rem)',
            color: '#9090B0',
            fontWeight: 700
          }}
        >
          Suit up and<br />save the future
        </p>

        {/* CTA Button */}
        <button
          className="inline-flex items-center gap-3 px-10 py-4 
                     text-white font-bold uppercase tracking-widest
                     transition-all duration-200 hover:scale-105"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '0.8rem',
            background: '#D91F40',
            clipPath: `polygon(
              0% 20%, 4% 0%, 96% 0%, 100% 20%,
              100% 80%, 96% 100%, 4% 100%, 0% 80%
            )`,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <span className="text-xs">▶</span>
          Get Started
        </button>
      </div>
    </section>
  )
}

React + CSS Modules (Component Architecture)
jsx// Hero.module.css handles clip-path and animation
// Component structure for the full design system:

// DesignTokens.js
export const tokens = {
  colors: {
    bgPrimary: '#100F2C',
    accent: '#D91F40',
    textPrimary: '#FFFFFF',
    textMuted: '#9090B0',
  },
  fonts: {
    display: "'Orbitron', sans-serif",
    body: "'Inter', sans-serif",
  },
  clipPaths: {
    hexButton: 'polygon(0% 20%, 4% 0%, 96% 0%, 100% 20%, 100% 80%, 96% 100%, 4% 100%, 0% 80%)',
    hexIcon: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    footerAngle: 'polygon(0 8%, 100% 0%, 100% 100%, 0% 100%)',
  }
}

// HexButton.jsx — Reusable branded button
import { tokens } from './DesignTokens'
import styles from './HexButton.module.css'

export function HexButton({ children, variant = 'primary', icon, onClick }) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]}`}
      onClick={onClick}
    >
      {icon && <span className={styles.iconWrap}>{icon}</span>}
      <span className={styles.label}>{children}</span>
    </button>
  )
}

// HexButton.module.css
/*
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2.5rem;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #fff;
  border: none;
  cursor: pointer;
  clip-path: polygon(0% 20%, 4% 0%, 96% 0%, 100% 20%, 100% 80%, 96% 100%, 4% 100%, 0% 80%);
  transition: transform 0.18s ease, filter 0.18s ease;
}
.btn:hover { transform: scale(1.04); filter: brightness(1.15); }
.primary { background: #D91F40; }
.dark { background: #100F2C; border: 1px solid rgba(255,255,255,0.15); }
*/

// AtmosphericSection.jsx — Section wrapper with depth layering
export function AtmosphericSection({ children, bgSrc, fogTop, fogBottom }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: '#100F2C' }}>
      {bgSrc && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${bgSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.4,
          zIndex: 0
        }} />
      )}
      {fogTop && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '120px',
          background: 'linear-gradient(to bottom, #100F2C, transparent)',
          zIndex: 1
        }} />
      )}
      {fogBottom && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px',
          background: 'linear-gradient(to top, #100F2C, transparent)',
          zIndex: 1
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </section>
  )
}

Key Principles Summary for Rebuild
Design ElementRuleColor paletteMax 3 colors: #100F2C, #D91F40, #FFFFFFButton shapeAlways clip-path polygon — never border-radiusTypography displayOrbitron heavy for all UI chrome and headingsDepth techniqueVideo/image bg + opacity overlay + gradient fog divSection transitionsFog/overlay divs between sections, never hard edgesSpacing8px base unit, generous section padding (80–120px)MotionSlow, dramatic, purposeful — no snappy interactionsIcon styleCustom SVG, geometric, polygon-containedText densityMinimal — each section has ≤4 sentences of body textInteractive SVGCharacters are SVG with polygon hover masks