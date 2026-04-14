Magic Receipt AI — Full UI/UX Design Audit

1. Visual Identity & Brand Feel
Overall Mood: Futuristic tech-noir with editorial flair — think retro-computing meets modern AI startup.
Brand Personality:

Confident and slightly irreverent ("Receipts are a nightmare. Deal with it. Not anymore!")
Technical precision aesthetic borrowed from sci-fi interfaces and old terminal UIs
Self-aware humor balanced with professional credibility
Anti-corporate — deliberately edgy for a fintech tool

Emotional Tone:

Empowerment through automation
Playful frustration relief — the brand acknowledges the pain before solving it
Trust through visual precision (grid corners, measurement UI chrome, battery indicators)
Premium without being stuffy


2. Color System
Primary Colors:

#95FF00 — Electric neon lime/green (primary accent, brand signature)
#15171A / #0B0C0D — Near-black charcoal (primary background)
#FFFFFF — White (typography, line elements)

Secondary/Supporting Colors:

#9542F4 — Electric purple (marquee stripe elements only)
#A5CDFF — Soft blue (connector lines in the hero diagram, subtle highlights)
#FF4500 — Reddit orange (CTA section, brand-specific)
#7A7C7D — Mid-gray (secondary text, inactive icon states)

Accent Colors:

#95FF00 dominates all interactive and highlight moments
Blue #A5CDFF used exclusively for the data-flow SVG lines (technical credibility)

Background Layering Strategy:

Base: #15171A dark charcoal
Overlay: radial gradient rgba(21,23,26,0) → rgba(21,23,26,1) (vignette technique)
Grid pattern: rgba(255,255,255,0.1) lines at 45px intervals on dark backgrounds
Multiple layered pseudo-depths using opacity stacking rather than color changes

Light vs Dark Balance:

90/10 dark-dominant — almost entirely dark with white text and neon accent punctuation
Zero light mode consideration in codebase

Gradient Usage:

Radial blur "orb" gradients (lime → white, white → lime) as ambient light sources
SVG-embedded radial gradients for the footer mask reveals
filter: blur(6rem) on colored divs to simulate volumetric light (not CSS gradients per se)
Text has text-shadow: 0px 0px 4.8px #95FF00 for neon glow on pricing

Contrast Ratio Quality:

#95FF00 on #15171A — excellent (passes WCAG AA and likely AAA)
White on dark — excellent
Gray #7A7C7D on dark — marginal, borderline AA for small text


3. Typography System
Fonts Used:

Almarai — Primary UI font (Arabic-origin geometric sans-serif; weights 300–700)
DM Mono — Monospace, used for technical/code-adjacent UI chrome text (version strings, serial numbers)
Rock Salt — Irregular handwritten/graffiti style (used for "Not anymore!" overlay text)

Heading Style & Hierarchy:

H1: Uppercase, wide tracking, large scale, 2–3 word punchy statements
H2: text-style-allcaps class — uppercase with letter-spacing
H3: Section subheadings, lighter weight
Visual hierarchy enforced through scale contrast, not font family switching

Font Weight Usage:

700 (Bold): Hero headings, pricing figure, CTAs
400 (Regular): Body copy, nav links
300 (Light): Supporting text, opacity-reduced secondary info

Line Height & Spacing:

Generous line-height on headings (editorial feel)
Body: standard 1.5–1.6
.text-size-large, .text-size-medium, .text-size-tiny — custom scale classes
opacity-7 class used extensively (likely opacity: 0.7) for hierarchy without color change

Text Density:

Very airy — short copy blocks, punchy headlines
Lots of whitespace between sections
Deliberately minimal paragraph length


4. Layout & Grid Structure
Container Width:

.container-large — boxed, centered with margin: auto
Full-bleed sections for stripe/marquee elements that break out of containers
padding-global + padding-section-large as consistent section wrapper pattern

Grid System:

Custom flex-based layout (Webflow's layout engine)
w-layout-hflex / w-layout-vflex — horizontal/vertical flex containers
Card grid: 3-column on desktop, stacks on mobile
Hero: vertical centered stack

Spacing Rhythm:

Gap classes: gap-2, gap-4, gap-6, gap-8, gap-10, gap-12, gap-16, gap-20, gap-22, gap-36, gap-38
Appears to be a 4px base unit system (gap-2 = 8px, gap-4 = 16px, gap-6 = 24px etc.)
spacer-xsmall, spacer-small, spacer-medium, spacer-large, spacer-xlarge, spacer-xxhuge — semantic spacer classes

Section Segmentation:

Clear full-viewport sections with <section> tags
Hero → animated scanner demo → marquee stripe → benefits swiper → how-to steps → persona cards → pricing → testimonials → FAQ → Reddit CTA → Footer
Each section has distinct purpose and visual treatment

Content Alignment:

Center-alignment dominant for hero, pricing, testimonials
Left-align for card content
Flex align-center and items_center throughout

Visual Hierarchy:

Size → Weight → Color → Opacity — four-layer hierarchy system
Neon green punctuates only the most critical elements


5. Component Breakdown
Navbar:

Sticky (.nav_fixed)
Dark background with slight transparency blending
Logo left, nav links center (desktop), CTA button right
Mobile: hamburger trigger → full-screen dropdown overlay with grid background animation
Nav links are text-only, no borders/underlines on default state

Hero Section:

Full-viewport centered stack
Star ratings + social proof line above headline
Headline uses strikethrough + overlay text animation ("Deal with it" crossed out, "Not anymore!" overlaid in Rock Salt)
Dual CTA buttons (App Store + Google Play) with SVG brand icons
Free trial nudge below buttons

Buttons:

.button.is-secondary — outlined/ghost style, white border, neon text on dark
.button.is-icon-2 — dark background with neon icon + label, square-ish border radius
No pill shapes — corners are relatively sharp (low border-radius, ~4–6px estimated)
Hover states swap background/text colors

Cards:

.swiper_card — dark bordered cards with subtle corner bracket decorations (not full borders, just corner L-brackets in low opacity white)
.card_container — image + text structure, image has a dark gradient overlay
No drop shadows — elevation implied through border and background contrast

Forms & Inputs:

None visible on the landing page (app downloads, no in-page forms)

Footer:

Large "See the magic for yourself" heading
Two large download link blocks with icon swap on hover
Bottom row: Privacy policy | Legal text | Social icons (Reddit, LinkedIn)
Masked reveal animation on scroll (radial gradient unmask)

CTA Patterns:

Every section ends with or contains App Store + Google Play buttons
"Try it free for 14 days" consistently adjacent to download CTAs
Reddit community CTA as secondary conversion path


6. Depth, Effects & Visual Enhancements
Shadows:

SVG-embedded feGaussianBlur drop shadows on the report/document illustrations
No traditional CSS box-shadow detected — depth through layering
Hard-edged for UI chrome elements; soft diffuse for ambient light orbs

Border Radius:

Near-zero radius on most elements (cards, buttons: ~4px)
Full circle on the ambient glow orb divs
App store icon badges: rx="8" on SVGs

Glassmorphism / Neumorphism:

Neither — the aesthetic is terminal UI / sci-fi chrome — hard edges, grid lines, corner brackets
Corner bracket decorators on cards simulate precision measurement equipment

Glow & Highlight Effects:

text-shadow: 0 0 4.8px #95FF00 on pricing text
SVG feGaussianBlur + feColorMatrix for glowing connecting lines (blue)
Blurred colored orb divs (filter: blur(6rem)) as ambient light sources
Scanner animation line has a blurred twin behind it for glow effect

Iconography:

Custom SVG icons throughout — no icon library
Flat, 1px stroke, minimal, geometric
App Store and Google Play icons are custom-colored SVG (not official assets)

Illustration Style:

Flat SVG illustrations (receipt, bank statement mockups)
Black and white photography for persona cards with CSS filter overlay
Scanner animation is CSS/JS driven over SVG document mockups


7. Interaction & Animation Style
Hover Effects:

Button icon containers swap (.footer_link_block_large_icon vs _hover variant swap)
Nav CTA button color invert on hover

Scroll Animations:

GSAP ScrollTrigger driving most animations
data-heading-reveal="true" — headings animate in on scroll (likely split text)
data-reveal="true" on FAQ items
Lenis smooth scroll (custom easing on all scroll behavior)
The scanner line animation is CSS keyframe, infinite loop
Section background masks reveal on scroll (radial gradient unmask technique)

Microinteractions:

Loading bar animation in the digital grid section (receipt processing simulation)
Swiper carousel with custom prev/next controls
Mobile menu open/close with animated hamburger lines

Transition Smoothness:

Lenis provides buttery smooth scroll momentum
GSAP ensures spring-like or ease-out transitions
Motion personality: dramatic and deliberate — slow reveals, purposeful movement

Motion Personality: Cinematic/dramatic — not snappy. Animations are used to tell the product story (scan → extract → reconcile → report).

8. Responsiveness Strategy
Mobile Layout Behavior:

mobile_col class: flex direction switches to column
hide-tablet, hide-desktop, hide-mobile utility classes for selective visibility
Navigation collapses to hamburger + full overlay menu
Swiper carousels replace multi-column grids on mobile

Navbar Collapse Pattern:

Desktop: inline nav links + CTA button
Mobile: icon-only download button + hamburger → full-screen overlay with gradient grid background

Font Scaling:

@media (min-aspect-ratio: 2) sets html { font-size: 14px } for ultrawide
Heading classes scale with viewport via Webflow's responsive breakpoints
text-size-large, text-size-medium etc. are likely custom clamp-based scales

Content Stacking:

Hero: already centered vertical stack (no change needed)
How-to section: mobile_col switches side-by-side to stacked
Card grid: 3-col → 1-col via swiper on mobile
Testimonials: masonry/grid → swiper


9. Technical Estimation
Frontend Framework: Webflow (confirmed — data-wf-site, w-nav-brand, Webflow CDN assets, .w-dyn-items CMS lists)
CSS Methodology:

Webflow's utility class system (BEM-adjacent but not strict BEM)
Custom utility classes layered on top: gap-N, spacer-*, text-size-*, opacity-7
Likely 4px spacing scale throughout

Animation Libraries:

GSAP 3.12.5 + ScrollTrigger (explicitly imported)
Swiper 11 (carousel)
Lenis 1.3.4 (smooth scroll)
SplitType (text splitting for character/word animations)

Performance Considerations:

will-change: transform, opacity on .digital_grid_section (GPU promotion)
translateZ(0) + backface-visibility: hidden for compositing optimization
.avif image format used throughout (excellent compression)
Videos use poster images for instant visual feedback
Multiple deferred/lazy loaded assets


10. Rebuild Blueprint
Design Principles to Extract:

Near-black background with single neon accent
Grid line overlay at low opacity
Corner bracket UI chrome on containers
Ambient glow orbs (blurred colored divs)
Uppercase tracked headings
Monospace secondary text for technical feel
Scanner/processing animation as hero storytelling


Plain HTML/CSS Hero
html<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Magic Receipt AI – Hero</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@300;400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --neon: #95FF00;
    --bg: #15171A;
    --bg-2: #0B0C0D;
    --white: #ffffff;
    --muted: rgba(255,255,255,0.5);
    --grid-line: rgba(255,255,255,0.07);
    --radius: 4px;
  }

  body {
    background: var(--bg);
    color: var(--white);
    font-family: 'Space Grotesk', sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* Grid background */
  .grid-bg {
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
      linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
    background-size: 45px 45px;
    pointer-events: none;
    z-index: 0;
  }

  /* Ambient glow orb */
  .orb {
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(149,255,0,0.15) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
    filter: blur(40px);
  }

  /* Nav */
  nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    padding: 20px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(21,23,26,0.8);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .logo {
    font-family: 'DM Mono', monospace;
    font-size: 14px;
    letter-spacing: 0.1em;
    color: var(--neon);
    text-transform: uppercase;
  }

  .nav-links { display: flex; gap: 32px; list-style: none; }
  .nav-links a {
    color: var(--muted);
    text-decoration: none;
    font-size: 14px;
    letter-spacing: 0.05em;
    transition: color 0.2s;
  }
  .nav-links a:hover { color: var(--white); }

  .btn-primary {
    background: transparent;
    border: 1px solid var(--neon);
    color: var(--neon);
    padding: 10px 20px;
    font-size: 13px;
    font-family: inherit;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: var(--radius);
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .btn-primary:hover { background: var(--neon); color: var(--bg); }

  /* Hero */
  .hero {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 120px 24px 80px;
    gap: 24px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 6px 14px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 2px;
  }
  .badge-dot {
    width: 6px; height: 6px;
    background: var(--neon);
    border-radius: 50%;
  }

  .hero-heading {
    font-size: clamp(40px, 7vw, 96px);
    font-weight: 700;
    line-height: 1.0;
    letter-spacing: -0.03em;
    text-transform: uppercase;
    max-width: 900px;
  }

  .hero-heading em {
    font-style: normal;
    color: var(--neon);
    text-shadow: 0 0 30px rgba(149,255,0,0.4);
  }

  .hero-sub {
    font-size: clamp(16px, 2vw, 20px);
    color: var(--muted);
    max-width: 560px;
    line-height: 1.6;
    font-weight: 300;
  }

  .hero-ctas {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
  }

  .btn-store {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-2);
    border: 1px solid rgba(255,255,255,0.12);
    color: var(--white);
    padding: 12px 20px;
    border-radius: var(--radius);
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: border-color 0.2s, background 0.2s;
  }
  .btn-store:hover { border-color: var(--neon); background: rgba(149,255,0,0.05); }
  .btn-store svg { flex-shrink: 0; }

  .trial-note {
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    color: var(--muted);
    letter-spacing: 0.05em;
  }

  /* Corner bracket card */
  .corner-card {
    position: relative;
    margin-top: 40px;
    padding: 32px;
    max-width: 480px;
    width: 100%;
  }
  .corner-card::before, .corner-card::after,
  .corner-card .corner-br, .corner-card .corner-bl {
    content: '';
    position: absolute;
    width: 16px; height: 16px;
  }
  .corner-card::before {
    top: 0; left: 0;
    border-top: 1px solid var(--white);
    border-left: 1px solid var(--white);
    opacity: 0.3;
  }
  .corner-card::after {
    top: 0; right: 0;
    border-top: 1px solid var(--white);
    border-right: 1px solid var(--white);
    opacity: 0.3;
  }
  .corner-card .corner-br {
    bottom: 0; right: 0;
    border-bottom: 1px solid var(--white);
    border-right: 1px solid var(--white);
    opacity: 0.3;
  }
  .corner-card .corner-bl {
    bottom: 0; left: 0;
    border-bottom: 1px solid var(--white);
    border-left: 1px solid var(--white);
    opacity: 0.3;
  }
  .scan-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: var(--neon);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .scan-bar {
    height: 2px;
    background: rgba(255,255,255,0.08);
    border-radius: 1px;
    overflow: hidden;
  }
  .scan-bar-fill {
    height: 100%;
    background: var(--neon);
    box-shadow: 0 0 8px var(--neon);
    animation: scan 2.4s ease-in-out infinite;
    width: 40%;
  }
  @keyframes scan {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }

  @media (max-width: 768px) {
    nav { padding: 16px 20px; }
    .nav-links { display: none; }
    .hero { padding: 100px 20px 60px; }
  }
</style>
</head>
<body>

<div class="grid-bg"></div>
<div class="orb"></div>

<nav>
  <div class="logo">Magic Receipt <span style="color:white">AI</span></div>
  <ul class="nav-links">
    <li><a href="#">Benefits</a></li>
    <li><a href="#">How to use</a></li>
    <li><a href="#">Pricing</a></li>
  </ul>
  <button class="btn-primary">Download Now</button>
</nav>

<section class="hero">
  <div class="badge">
    <span class="badge-dot"></span>
    Used by smart professionals
  </div>

  <h1 class="hero-heading">
    Receipts are a<br><em>nightmare</em>
  </h1>

  <p class="hero-sub">
    Forget juggling receipts and reconciling statements.
    Magic Receipt AI takes care of it all — fast, seamless, and stress-free.
  </p>

  <div class="hero-ctas">
    <a href="#" class="btn-store">
      <svg width="16" height="20" viewBox="0 0 18 23" fill="none">
        <path d="M15.05 12.48C15.06 11.65 15.28 10.83 15.69 10.1C16.1 9.38 16.69 8.77 17.4 8.33C16.95 7.68 16.36 7.15 15.66 6.78C14.97 6.4 14.2 6.2 13.41 6.17C11.73 6 10.1 7.18 9.25 7.18C8.38 7.18 7.06 6.19 5.64 6.22C4.72 6.25 3.83 6.51 3.04 6.99C2.26 7.47 1.61 8.14 1.17 8.95C-0.77 12.29 0.68 17.22 2.53 19.92C3.46 21.25 4.54 22.73 5.96 22.68C7.34 22.62 7.86 21.79 9.54 21.79C11.2 21.79 11.68 22.68 13.13 22.64C14.62 22.62 15.55 21.31 16.45 19.97C17.11 19.03 17.63 17.99 17.97 16.88C17.1 16.52 16.36 15.9 15.84 15.12C15.33 14.34 15.05 13.42 15.05 12.48Z" fill="#95FF00"/>
        <path d="M12.32 4.39C13.13 3.42 13.53 2.17 13.43 0.9C12.19 1.03 11.04 1.62 10.22 2.56C9.82 3.02 9.51 3.55 9.32 4.13C9.12 4.7 9.04 5.31 9.08 5.92C9.7 5.93 10.31 5.79 10.87 5.53C11.43 5.26 11.93 4.88 12.32 4.39Z" fill="#95FF00"/>
      </svg>
      App Store
    </a>
    <a href="#" class="btn-store">
      <svg width="18" height="20" viewBox="0 0 22 24" fill="none">
        <path d="M11.15 11.9L15.62 16.37L5.73 22.73C5.41 22.92 5.04 23.04 4.66 23.09L2.18 22.28L10.45 11.9L11.15 11.9Z" fill="#95FF00"/>
        <path d="M15.55 7.39L19.76 9.82C20.6 10.31 21.19 11.17 21.25 12.13C21.19 13.09 20.6 13.95 19.76 14.44L15.51 16.83L10.45 11.9L15.55 7.39Z" fill="#95FF00"/>
        <path d="M2.39 3.27L10.45 11.9L2.39 21.26C1.87 20.97 1.47 20.48 1.56 19.93V4.21C1.47 3.73 1.87 3.56 2.39 3.27Z" fill="#95FF00"/>
        <path d="M5.78 1.8L15.55 7.39L10.45 11.9L1.69 3.97C2.26 3.19 3.42 1.7 5.78 1.8Z" fill="#95FF00"/>
      </svg>
      Google Play
    </a>
  </div>

  <p class="trial-note">Try it free for 14 days — no credit card required</p>

  <div class="corner-card">
    <div class="corner-br"></div>
    <div class="corner-bl"></div>
    <div class="scan-label">AI scanning in progress</div>
    <div class="scan-bar">
      <div class="scan-bar-fill"></div>
    </div>
  </div>
</section>

</body>
</html>

Tailwind CSS Hero (React-ready classes)
jsx// Install: npx create-react-app . && npm install
// Add to tailwind.config.js: extend colors with neon: '#95FF00'

export default function Hero() {
  return (
    <div className="relative min-h-screen bg-[#15171A] text-white overflow-hidden">

      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '45px 45px'
        }}
      />

      {/* Ambient orb */}
      <div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(149,255,0,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)'
        }}
      />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5 bg-[rgba(21,23,26,0.85)] backdrop-blur-md border-b border-white/5">
        <span className="font-mono text-sm tracking-widest uppercase text-[#95FF00]">
          Magic Receipt <span className="text-white">AI</span>
        </span>
        <ul className="hidden md:flex gap-8 list-none">
          {['Benefits', 'How to use', 'Pricing'].map(link => (
            <li key={link}>
              <a href="#" className="text-white/50 text-sm tracking-wide hover:text-white transition-colors">
                {link}
              </a>
            </li>
          ))}
        </ul>
        <button className="border border-[#95FF00] text-[#95FF00] px-5 py-2 text-xs font-semibold uppercase tracking-widest rounded-[4px] hover:bg-[#95FF00] hover:text-[#15171A] transition-all">
          Download Now
        </button>
      </nav>

      {/* Hero content */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 gap-6">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-white/10 px-4 py-1.5 rounded-[2px] font-mono text-[11px] uppercase tracking-widest text-white/50">
          <span className="w-1.5 h-1.5 rounded-full bg-[#95FF00]" />
          Used by smart professionals
        </div>

        {/* Heading */}
        <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tight leading-none max-w-4xl">
          Receipts are a{' '}
          <em
            className="not-italic text-[#95FF00]"
            style={{ textShadow: '0 0 30px rgba(149,255,0,0.35)' }}
          >
            nightmare
          </em>
        </h1>

        {/* Subtext */}
        <p className="text-white/50 text-lg max-w-xl leading-relaxed font-light">
          Forget juggling receipts and reconciling statements.
          Magic Receipt AI takes care of it all — fast, seamless, and stress-free.
        </p>

        {/* CTAs */}
        <div className="flex gap-3 flex-wrap justify-center mt-2">
          {['App Store', 'Google Play'].map(store => (
            
              key={store}
              href="#"
              className="flex items-center gap-2 bg-[#0B0C0D] border border-white/10 text-white px-5 py-3 rounded-[4px] text-sm font-semibold hover:border-[#95FF00] hover:bg-[rgba(149,255,0,0.05)] transition-all"
            >
              {store}
            </a>
          ))}
        </div>

        <p className="font-mono text-xs text-white/40 tracking-wide">
          Try it free for 14 days
        </p>

        {/* Scanner card with corner brackets */}
        <div className="relative mt-8 p-8 w-full max-w-md">
          {/* Corner brackets */}
          {[
            'top-0 left-0 border-t border-l',
            'top-0 right-0 border-t border-r',
            'bottom-0 left-0 border-b border-l',
            'bottom-0 right-0 border-b border-r',
          ].map((pos, i) => (
            <span
              key={i}
              className={`absolute ${pos} w-4 h-4 border-white/25`}
            />
          ))}
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#95FF00] mb-3">
            AI scanning in progress
          </p>
          <div className="h-0.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full w-2/5 rounded-full"
              style={{
                background: '#95FF00',
                boxShadow: '0 0 8px #95FF00',
                animation: 'scan 2.4s ease-in-out infinite'
              }}
            />
          </div>
          <style>{`
            @keyframes scan {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(350%); }
            }
          `}</style>
        </div>
      </section>
    </div>
  );
}

Key Principles Summary for Rebuilding This Aesthetic
PrincipleImplementationNear-black base#15171A / #0B0C0DSingle neon accent#95FF00 — use sparinglyGrid overlay45px CSS background-image lines at 6–8% opacityCorner bracketsPseudo-elements or absolute spans, not full bordersGlow texttext-shadow: 0 0 20-30px rgba(149,255,0,0.4)Ambient lightBlurred colored div, filter: blur(40px)TypographyUppercase, tight tracking on headings; mono for technical chromeMotionGSAP ScrollTrigger + Lenis — avoid CSS-only scrollPhotographyDesaturated/B&W with dark overlayDepthLayering + opacity, not shadows