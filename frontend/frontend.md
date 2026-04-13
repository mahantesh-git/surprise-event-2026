Design Audit Report: Sutéra — Reality By Design
sutera.ch | Senior UI/UX & Frontend Systems Analysis
1. Visual Identity & Brand Feel
Overall Mood: Post-digital minimalism meets technical precision — think aerospace documentation crossed with experimental editorial design. It occupies a rare niche between Swiss graphic design rigor and speculative futures aesthetics.

Brand Personality:

Intellectually confident without being cold
Technically fluent but humanist at its core
Solo practitioner energy — intimate, curated, not corporate
Strongly "designed by a designer for designers" — the site itself is the portfolio
Emotional Tone:

Curiosity and precision in equal measure
A sense of inhabiting the edge between human biology and machine systems
Understated gravity — nothing shouts, everything signals
The name etymology ("underneath the earth") embedded in the UI as a wink to deep roots and quiet foundations
2. Color System
Primary Colors:

#FFFFFF — dominant background, almost aggressively clean
#000000 — primary text, strokes, borders
#A9A9A9 — grid crosshair markers, secondary UI chrome
Secondary/Supporting Colors:

#F2F2F2 — grid line color, subtle spatial dividers
#CBCBCB — fill for decorative pixel/block elements
Accent Colors (Project-specific, used as hover/overlay tints):

#BCD4FD — soft periwinkle blue (Project 01)
#E3C0A9 — muted terracotta (Project 02)
#C9C1FF — lavender (Project 03)
#E88150 — burnt orange (Project 04)
#FFA796 — salmon (Project 05)
#F9CCDD — blush pink (Project 06)
#91B394 — sage green (Project 07)
#59E7CA — aqua/teal (Project 08)
#996B4A — warm brown (Project 09)
Background Layering Strategy:

Pure white as the base field
Semi-transparent white overlays on SVG diagram areas (opacity: 0.7) to create depth within a monochromatic system
No dark mode — the lightness is a deliberate brand statement
The page essentially uses whitespace as a material, not just negative space
Light vs Dark Balance: Approximately 90% light / 10% dark — near-total white field with black as the sole structural color. Very high contrast, zero gray fog.

Gradient Usage: None. This is deliberate — gradients would soften the technical precision aesthetic.

Contrast Ratio Quality: Exceptional. Black on white everywhere for body text. The gray tones are used only for decorative/structural elements, never for readable text.

3. Typography System
Font Categories:

Primary (functional/UI): A geometric uppercase sans-serif for navigation, labels, lists, metadata — referred to internally as font-main. Likely a mono-adjacent grotesque such as Space Grotesk, Aktiv Grotesk, or a custom variant.
Secondary (expressive/body): A broader reality-font class used for large display headings and long-form body text — suggests a higher-contrast serif or a refined humanist sans with variable weight support.
Heading Style and Hierarchy:

H1 ("Reality, By Design") is enormous — viewport-filling display text using text-xxl scaling
H2s are still large but compositionally anchored — not just bigger text, but text that participates in layout
No decorative heading underlines or dividers — whitespace alone creates hierarchy
Font Weight Usage:

A --f-bold custom property is used for the brandmark and card titles
Body text stays in a single weight range — no medium/semibold hedging
Weight contrast is minimal — scale does the hierarchical work
Line Height and Spacing Patterns:

Leading of 0.9 for the footer identity text signals deliberate tightness as a style choice
leading-none and leading-[0.84em] for UI chrome elements
Body text appears to use generous leading (approximately 1.5–1.6) for readability
--text-s--line-height as a custom property confirms a systematic approach
Text Density: Maximally airy. The site breathes. Long paragraphs are short in absolute line count, and no text block crowds another. The layout treats text as a visual object with spatial mass.

4. Layout & Grid Structure
Container Width Style: Full-width with margin-based containment using --grid-margin as a CSS custom property. No fixed max-width container — the layout stretches to fill the viewport and uses proportional units.

Grid System:

A custom responsive grid defined via CSS variables: --grid-margin, --grid-gutter
Three distinct breakpoints: mobile (default), custom-tab (tablet, ~768px), custom-desktop (~1240px)
Desktop uses a rough 12-column mental model expressed as fractional widths (w-2/12, w-8/12, w-4/12)
The SVG background grids literally draw the column and row structure: mobile uses 3 columns, tablet uses 5, desktop uses 4 with 3 rows — the structural grid is made visible as a design element
Spacing Rhythm:

svh-based vertical spacing (mb-[3.73svh], pt-[7.46svh]) — tied to viewport height, not a fixed px system
Horizontal spacing follows the --grid-margin and --grid-gutter variables
This is not a strict 4px/8px system — it is a proportional, viewport-relative system designed to feel consistent across screen sizes
Section Segmentation: Loose and narrative — sections flow into each other rather than being separated by obvious dividers. The SVG structural drawings function as invisible scaffolding.

Content Alignment Patterns:

Mobile: centered with full-width stacking
Tablet/Desktop: asymmetric multi-column compositions that feel editorial rather than grid-locked
Text and image elements frequently overlap or float, anchored by absolute positioning within relative containers
Visual Hierarchy Structure: Size → Position → Weight. Color is not used for hierarchy — it is used for project identity. The eye is guided by scale and spatial placement, not colorblocking.

5. Component Breakdown
Navbar:

fixed to top, full width, z-50
Fully transparent background — no fill, no blur, no shadow
Three-column layout: brand name (left), CTA pill (center), local time display (right)
Typography-only — no icons, no hamburger on desktop
The "Change Reality" button is a bordered pill with no fill and very small text
Hero Section:

Compositionally the most complex element on the page
Text ("Reality, By Design") uses the display font at maximum scale
Animated SVG diagrams with connecting lines and dot markers orbit the main content
A canvas element handles what appears to be a 3D or particle animation in the viewport center
Blueprint-card aesthetic for the SUTÉRA identity box (bordered container with inner content)
Buttons:

Exclusively outline/bordered style with rounded-pill border radius (rounded-[52px])
No filled buttons exist on the page — this is a conscious tonal choice (assertive but not aggressive)
Small text, minimal padding, high air ratio
Example: border rounded-[52px] px-[0.57em] py-[0.15em]
Cards:

SVG-bordered containers with explicit crosshair/close decorations in corners
Flat — no box shadows, no elevation
White fill with black stroke — essentially technical diagram panels
The "window" metaphor: close buttons drawn with SVG X marks in corner rectangles
Forms & Inputs: No forms visible on the page — contact is handled via external links (LinkedIn, Instagram).

Footer Structure:

Right-aligned content block (9/12 width on tablet, 7/12 on desktop)
Two-column layout for speaking engagements and writing links
Bottom strip: identity mark, location text, a small scroll-to-top control, and social links
The animated GIF (Jennifer Aniston waving) is the footer's Easter egg personality moment
Call-to-Action Patterns:

CTAs are underplayed — external links styled as bordered pills
The most prominent CTA is the "Change Reality" nav element — which functions more as a modal trigger than a traditional conversion CTA
6. Depth, Effects & Visual Enhancements
Shadows: None. Zero box shadows across the entire site. Depth is created entirely through layering, SVG structure, and opacity.

Border Radius System:

Pill: rounded-[52px] for buttons and tags
Subtle: rounded-[10px] for project images
Sharp: rounded-[2px] for the nav CTA
SVG diagrams themselves carry their own corner rounding logic
Glassmorphism/Neumorphism: Neither. This is flat-technical — closer to a CAD interface or hardware documentation aesthetic than any current UI trend.

Glow or Highlight Effects: None visible. The white-on-white with transparency is the only "soft" effect.

Iconography Style:

Custom SVG throughout — no icon libraries
Icons are drawn artifacts: globe SVG, geometric orbital diagram, pixel-grid bars, arrow chevrons
The crosshair marker (rectangle with cross lines) used at grid intersections is the site's signature icon motif
Illustration/Photography Style:

Photography is absent from the main composition
Imagery is confined to project thumbnails and Easter egg GIFs
The dominant visual language is custom SVG illustration — technical, precise, and monochromatic
GIFs function as personality injections: Tony Stark hologram, Jennifer Aniston, Jack Sparrow
7. Interaction & Animation Style
Hover Effects:

Project images have an overflow-hidden container suggesting scale or reveal on hover
The "dog-img-trigger" and similar elements trigger hidden image panels on hover
Nav item "Change Reality" likely triggers a full-screen modal based on the fixed overlay structure
The pointer-fine utility class gates hover effects to non-touch devices
Scroll Animations:

The SVG path elements (.main-path, .main-path-2, .main-path-3) with their sequential naming suggest staggered path draw animations on scroll
The .main-dot elements animate in after the paths
The loader system uses a grid of white <span> elements that tile-dissolve away
Microinteractions:

Cursor: a custom white-square crosshair cursor replaces the system cursor, positioned via fixed and negative offsets
The tooltip system (.from-text / .destination-text pattern) suggests a text-scramble or reveal animation on hover
Easter eggs are hidden behind specific hover targets
Transition Smoothness: Smooth and deliberate — nothing snaps. The motion personality is unhurried and precise, like watching technical equipment initialize.

Motion Personality: Slow, intentional, architectural. Animations feel like systems coming online rather than UI elements showing off.

8. Responsiveness Strategy
Mobile Layout Behavior:

Single-column stacking throughout
The SVG grid background switches to a 3-column layout
Hero text maintains its scale but the flanking SVG diagrams collapse or hide
Project grid collapses to 2-column (w-(--item-w) at 50% - gutter)
Navbar Collapse Pattern: No hamburger menu. The three-column navbar simplifies on mobile — the local time display hides (hidden custom-tab:flex). Navigation appears to be entirely within the "Change Reality" overlay.

Font Scaling Logic:

text-xxl, text-xl, text-l, text-m, text-s, text-xs, text-xxs — a custom scale using CSS variables
Sizes are likely clamp()-based or use viewport units to scale smoothly
The custom-tab:text-s pattern shows explicit breakpoint overrides for typographic comfort
Content Stacking Structure:

Mobile: full-width, vertically stacked, center-aligned
Tablet: multi-column with absolute-positioned SVG accents appearing
Desktop: full editorial composition with overlapping elements, floating diagrams, and wide text blocks
9. Technical Estimation
Frontend Framework: Nuxt 3 (Vue 3) — confirmed by id="__nuxt", __NUXT__ global, and the SSR data blob. Built on Nuxt with server-side rendering enabled.

CMS: Prismic — confirmed by the prismic.min.js script, prismic.cdn URLs, and the extensive __NUXT_DATA__ Prismic document structure.

CSS Methodology:

Tailwind CSS — confirmed by utility class patterns (flex, items-center, w-full, z-50, custom-tab: prefix breakpoints)
Custom Tailwind config extends the default with custom-tab, custom-desktop breakpoints and a full custom spacing/sizing vocabulary
CSS custom properties extensively used for design tokens alongside Tailwind
Animation Libraries: Likely GSAP (GreenSock) — the sequential path animations, loader tile system, and scroll-based SVG draws are characteristic of GSAP ScrollTrigger. The canvas element suggests Three.js or a custom WebGL/2D canvas renderer.

Performance Considerations:

Images use Prismic's responsive image pipeline with srcset at multiple breakpoints
loading="lazy" on all below-fold images
Canvas-based animation may be performance-intensive on lower-end devices
The pointer-fine media query gates expensive hover interactions to desktop
10. Rebuild Blueprint
Design Principles to Carry Forward
White as material, black as structure
Custom SVG over icon libraries
No shadows — depth through layering
Viewport-relative spacing
Pill buttons, outline only
Grid as visible artifact
Plain HTML/CSS Hero
html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sutéra-style Hero</title>
<style>
  :root {
    --margin: clamp(16px, 4vw, 64px);
    --color-black: #000000;
    --color-white: #ffffff;
    --color-grid: #f2f2f2;
    --color-mark: #a9a9a9;
    --font-display: 'Space Grotesk', sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--font-display);
    background: var(--color-white);
    color: var(--color-black);
    text-transform: uppercase;
    letter-spacing: -0.02em;
    overflow-x: hidden;
  }

  /* Grid background */
  .grid-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background-image:
      linear-gradient(var(--color-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--color-grid) 1px, transparent 1px);
    background-size: 33.33vw 33.33vh;
  }

  /* Navbar */
  nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 20px var(--margin);
    z-index: 50;
  }

  .nav-brand {
    font-size: clamp(14px, 1.5vw, 18px);
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .nav-cta {
    border: 1px solid var(--color-black);
    border-radius: 2px;
    padding: 0.25em 0.5em 0.18em;
    font-size: clamp(10px, 1vw, 13px);
    cursor: pointer;
    background: transparent;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    transition: background 0.2s, color 0.2s;
  }

  .nav-cta:hover {
    background: var(--color-black);
    color: var(--color-white);
  }

  .nav-meta {
    font-size: 11px;
    text-align: right;
    line-height: 1.4;
    color: var(--color-mark);
  }

  .nav-meta span { color: var(--color-black); }

  /* Hero */
  .hero {
    position: relative;
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 12vh var(--margin) var(--margin);
    z-index: 1;
  }

  .hero-title {
    font-size: clamp(56px, 11vw, 160px);
    font-weight: 700;
    line-height: 0.9;
    letter-spacing: -0.04em;
  }

  /* Blueprint card */
  .blueprint-card {
    position: relative;
    border: 1px solid var(--color-black);
    padding: 1em;
    width: clamp(240px, 30vw, 380px);
    background: var(--color-white);
    margin-top: 6vh;
  }

  .blueprint-card::before {
    content: '';
    position: absolute;
    top: -1px; right: -1px;
    width: 17px; height: 17px;
    background: var(--color-white);
    border-left: 1px solid var(--color-black);
    border-bottom: 1px solid var(--color-black);
  }

  /* X marker via pseudo */
  .blueprint-card::after {
    content: '×';
    position: absolute;
    top: -6px; right: 1px;
    font-size: 12px;
    line-height: 1;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.6em;
    margin-bottom: 0.6em;
    border-bottom: 1px solid #cbcbcb;
  }

  .card-brand-name {
    font-size: clamp(12px, 2vw, 20px);
    font-weight: 700;
    line-height: 0.85;
  }

  .card-year { font-size: 10px; }

  .card-body {
    font-size: 10px;
    text-transform: none;
    line-height: 1.5;
    color: #333;
  }

  /* Hero bottom row */
  .hero-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 1em;
  }

  .hero-descriptor {
    font-size: clamp(10px, 1.1vw, 13px);
    max-width: 300px;
    text-transform: none;
    line-height: 1.6;
    letter-spacing: 0;
  }

  .pill-links {
    display: flex;
    gap: 0.5em;
  }

  .pill {
    border: 1px solid var(--color-black);
    border-radius: 52px;
    padding: 0.15em 0.57em;
    font-size: 11px;
    text-decoration: none;
    color: var(--color-black);
    line-height: 1;
    transition: background 0.2s, color 0.2s;
  }

  .pill:hover {
    background: var(--color-black);
    color: var(--color-white);
  }

  /* Core threads list */
  .core-list {
    font-size: 11px;
    list-style: none;
    min-width: 220px;
  }

  .core-list li {
    padding: 0.6em 0;
    border-bottom: 1px solid #f2f2f2;
    display: flex;
    gap: 0.5em;
  }

  .core-list li:last-child { border-bottom: none; }

  .tag-num {
    color: var(--color-mark);
    flex-shrink: 0;
  }
</style>
</head>
<body>

<div class="grid-bg"></div>

<nav>
  <div class="nav-brand">Sutéra</div>
  <button class="nav-cta">Change Reality</button>
  <div class="nav-meta">
    Local Time<br>
    <span>ZUR 14:32</span>
  </div>
</nav>

<section class="hero">

  <div>
    <h1 class="hero-title">
      Reality,<br>By Design
    </h1>

    <div class="blueprint-card">
      <div class="card-header">
        <div class="card-brand-name">SUTÉRA</div>
        <div class="card-year">/25</div>
      </div>
      <div class="card-body">
        su (underneath) + tera (earth)<br><br>
        → underneath the earth
      </div>
    </div>
  </div>

  <div class="hero-bottom">
    <div>
      <p class="hero-descriptor">
        I design systems that shape how humans and machines connect.
        From robotic extensions to perceptual interfaces.
      </p>
      <ul class="core-list" style="margin-top: 1.5em;">
        <li><span class="tag-num">01.</span> Perceptual Interfaces</li>
        <li><span class="tag-num">02.</span> Embodiment</li>
        <li><span class="tag-num">03.</span> IA & AI</li>
        <li><span class="tag-num">04.</span> Systems and Tools</li>
      </ul>
    </div>

    <div class="pill-links">
      <a href="#" class="pill">LinkedIn</a>
      <a href="#" class="pill">Medium</a>
      <a href="#" class="pill">Instagram</a>
    </div>
  </div>

</section>

</body>
</html>
Tailwind CSS Version
html
<!-- Requires Tailwind CDN or config with custom theme -->
<body class="bg-white text-black uppercase tracking-tight font-sans overflow-x-hidden">

  <!-- Grid background -->
  <div class="fixed inset-0 pointer-events-none z-0"
       style="background-image: linear-gradient(#f2f2f2 1px, transparent 1px),
              linear-gradient(90deg, #f2f2f2 1px, transparent 1px);
              background-size: 33.33vw 33.33vh;">
  </div>

  <!-- Navbar -->
  <nav class="fixed top-0 left-0 right-0 z-50 flex justify-between
              items-start px-8 md:px-16 pt-5">
    <span class="text-sm font-bold tracking-widest">Sutéra</span>

    <button class="border border-black rounded-sm px-2 py-0.5
                   text-[11px] hover:bg-black hover:text-white
                   transition-colors duration-200">
      Change Reality
    </button>

    <div class="text-[11px] text-right leading-snug hidden md:block">
      <span class="text-gray-400">Local Time</span><br>
      <span>ZUR 14:32</span>
    </div>
  </nav>

  <!-- Hero -->
  <section class="relative min-h-screen flex flex-col justify-between
                  px-8 md:px-16 pt-[12vh] pb-8 z-10">

    <div>
      <!-- Display title -->
      <h1 class="text-[clamp(56px,11vw,160px)] font-bold leading-none
                 tracking-[-0.04em] normal-case">
        Reality,<br>By Design
      </h1>

      <!-- Blueprint card -->
      <div class="relative border border-black bg-white p-4
                  w-[clamp(240px,30vw,380px)] mt-[6vh]">
        <!-- Corner X decoration -->
        <div class="absolute -top-px -right-px w-4 h-4 bg-white
                    border-l border-b border-black flex items-center
                    justify-center text-[10px]">×</div>

        <div class="flex justify-between items-center pb-2 mb-2
                    border-b border-gray-300">
          <span class="text-[clamp(12px,2vw,20px)] font-bold
                       leading-none tracking-wider">SUTÉRA</span>
          <span class="text-[10px]">/25</span>
        </div>

        <p class="text-[10px] normal-case leading-relaxed text-gray-600">
          su (underneath) + tera (earth)<br><br>
          → underneath the earth
        </p>
      </div>
    </div>

    <!-- Bottom row -->
    <div class="flex flex-wrap justify-between items-end gap-4">

      <div>
        <p class="text-[clamp(10px,1.1vw,13px)] normal-case
                  leading-relaxed max-w-xs tracking-normal">
          I design systems that shape how humans and machines connect.
        </p>

        <ul class="mt-6 text-[11px] min-w-[220px]">
          <li class="flex gap-2 py-2 border-b border-gray-100">
            <span class="text-gray-400">01.</span> Perceptual Interfaces
          </li>
          <li class="flex gap-2 py-2 border-b border-gray-100">
            <span class="text-gray-400">02.</span> Embodiment
          </li>
          <li class="flex gap-2 py-2 border-b border-gray-100">
            <span class="text-gray-400">03.</span> IA & AI
          </li>
          <li class="flex gap-2 py-2">
            <span class="text-gray-400">04.</span> Systems and Tools
          </li>
        </ul>
      </div>

      <div class="flex gap-2">
        <a href="#" class="border border-black rounded-full
                           px-3 py-0.5 text-[11px] leading-none
                           hover:bg-black hover:text-white
                           transition-colors duration-200 no-underline
                           text-black">LinkedIn</a>
        <a href="#" class="border border-black rounded-full
                           px-3 py-0.5 text-[11px] leading-none
                           hover:bg-black hover:text-white
                           transition-colors duration-200 no-underline
                           text-black">Medium</a>
      </div>

    </div>
  </section>

</body>
React Component Version
jsx
import { useState, useEffect } from "react";

const GridBackground = () => (
  <div
    className="fixed inset-0 pointer-events-none z-0"
    style={{
      backgroundImage: `
        linear-gradient(#f2f2f2 1px, transparent 1px),
        linear-gradient(90deg, #f2f2f2 1px, transparent 1px)
      `,
      backgroundSize: "33.33vw 33.33vh",
    }}
  />
);

const BlueprintCard = ({ brandName, year, subtitle, body }) => (
  <div
    className="relative border border-black bg-white p-4 mt-12"
    style={{ width: "clamp(240px, 30vw, 380px)" }}
  >
    {/* Corner decoration */}
    <div className="absolute -top-px -right-px w-4 h-4 bg-white
                    border-l border-b border-black flex items-center
                    justify-center text-[10px]">
      ×
    </div>
    <div className="flex justify-between items-center pb-2 mb-2
                    border-b border-gray-300">
      <span className="font-bold leading-none tracking-wider"
            style={{ fontSize: "clamp(12px, 2vw, 20px)" }}>
        {brandName}
      </span>
      <span className="text-[10px]">{year}</span>
    </div>
    <p className="text-[10px] leading-relaxed text-gray-600 normal-case">
      {body}
    </p>
  </div>
);

const PillLink = ({ href, children }) => (
  
    href={href}
    className="border border-black rounded-full px-3 py-0.5
               text-[11px] leading-none no-underline text-black
               hover:bg-black hover:text-white transition-colors
               duration-200 uppercase tracking-tight"
  >
    {children}
  </a>
);

const coreThreads = [
  { num: "01.", label: "Perceptual Interfaces" },
  { num: "02.", label: "Embodiment" },
  { num: "03.", label: "IA & AI" },
  { num: "04.", label: "Systems and Tools" },
];

export default function SuteraHero() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-CH", {
          timeZone: "Europe/Zurich",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-white text-black uppercase tracking-tight
                    font-sans overflow-x-hidden min-h-screen">
      <GridBackground />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex
                      justify-between items-start px-8 md:px-16 pt-5">
        <span className="text-sm font-bold tracking-widest">Sutéra</span>

        <button className="border border-black rounded-sm px-2 py-0.5
                           text-[11px] hover:bg-black hover:text-white
                           transition-colors duration-200">
          Change Reality
        </button>

        <div className="text-[11px] text-right leading-snug hidden md:block">
          <span className="text-gray-400">Local Time</span>
          <br />
          <span>ZUR {time}</span>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative flex flex-col justify-between
                   px-8 md:px-16 pt-[12vh] pb-8 z-10 min-h-screen"
      >
        <div>
          <h1
            className="font-bold leading-none tracking-[-0.04em]
                       normal-case"
            style={{ fontSize: "clamp(56px, 11vw, 160px)" }}
          >
            Reality,
            <br />
            By Design
          </h1>

          <BlueprintCard
            brandName="SUTÉRA"
            year="/25"
            body={
              <>
                su (underneath) + tera (earth)
                <br /><br />
                → underneath the earth
              </>
            }
          />
        </div>

        {/* Bottom row */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <p
              className="normal-case leading-relaxed max-w-xs
                         tracking-normal"
              style={{ fontSize: "clamp(10px, 1.1vw, 13px)" }}
            >
              I design systems that shape how humans and machines
              connect. From robotic extensions to perceptual interfaces.
            </p>

            <ul className="mt-6 text-[11px] min-w-[220px]">
              {coreThreads.map(({ num, label }) => (
                <li
                  key={num}
                  className="flex gap-2 py-2 border-b
                             border-gray-100 last:border-0"
                >
                  <span className="text-gray-400">{num}</span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <PillLink href="#">LinkedIn</PillLink>
            <PillLink href="#">Medium</PillLink>
            <PillLink href="#">Instagram</PillLink>
          </div>
        </div>
      </section>
    </div>
  );
}
Summary: Core Design DNA to Replicate
Principle	Implementation
White as material	Pure #fff background, no color fills
Black as structure	All borders, text, and SVG strokes in #000
Grid as aesthetic	Visible CSS grid background, structural guides
Outline-only buttons	border + border-radius: 52px, no fill
Blueprint cards	SVG-bordered panels with corner X markers
Viewport-relative spacing	svh, clamp(), custom CSS properties
No shadows anywhere	Depth via layering and opacity only
Project accent colors	Muted pastels applied per-project, not globally
Custom SVG over icons	All iconography drawn inline
Typography as scale	Hierarchy through size, not weight or color

