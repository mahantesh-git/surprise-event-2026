Visual Identity & Brand Feel
Mood
Sci-Fi Editorial — Dark, immersive, futuristic with a cinematic HUD aesthetic
Brand Personality
Technical authority meets creative playfulness. Feels like a space-age game studio meets aerospace consultancy
Emotional Tone
Awe + urgency. The universe is large, time is short, DSL makes it tangible
The site channels a fictional aerospace control room — orange HUD overlays, clipped polygon shapes, scrolling data readouts, and floppy-disk-shaped content cards. It's unambiguously space-industry-native without falling into generic rocket-ship clichés.

02 Color System
Primary Palette
#131314 — Background / void
#EE3A17 — Primary accent / CTA
#EC5E2A — Secondary accent
#E3E3E3 — Body text
Supporting & Layering
#1C1C1C — Nav / card surface
#F7BD14 — Tertiary accent (rare)
#EE3A17 @ 30% — Card fills / overlays
#EC5E2A @ 70% — Text muting layer
Strategy Notes
100% dark mode Orange duotone photography Alpha layering for depth No white surfaces High contrast text/bg ratio Single accent hue family
03 Typography System
Typefaces Detected
Sixsound-Regular — Custom display / heading font (geometric, wide-spaced)
IBM Plex Mono — Body mono / UI readouts (weights 400, 500, 600)
Open Sans — Paragraph / UI fallback
Type Hierarchy
h1 — Large display, ~9vw, tight tracking (−0.04em), line-height 0.8
h2 — Section hero, ~6–9vw responsive
h3 — Sub-section anchors
h4 — Card titles, 24px
h5 — Labels, 18–20px
h6 — Eyebrow tags, 13–14px, mono weight, italic for accent
p — Body at 70% opacity, compact line-height ~1.4
Spacing & Tracking
Letter-spacing: −0.02em to −0.06em on most text (tight, editorial). Line-height: 0.8 on hero display text, 1.1 on mid-size, 1.4–1.5 on body. Text density is compact — airy through generous section padding, not loose leading.
04 Layout & Grid Structure
Container Strategy
Full-bleed sections with a max-width of 1300px for content columns. Body borders (15px frame) create a windowed effect on desktop
Grid System
12-column WPBakery grid. Section rows use percentage-based padding (e.g. 9% of viewport width), making rhythm viewport-relative
Spacing Rhythm
Percentage-based vertical rhythm (~8–14% vw). Horizontal gutters: 20–40px. Component gap: 8–20px. Follows fluid spacing rather than fixed 8px grid
Section Patterns
Body-border frame (15px HUD edge) Full-bleed image BGs with mask-image fades Horizontal scroll sections (sticky scroll) Z-layered columns with negative margins Content alignment: left-dominant Alternating even/odd disk row mirroring
05 Component Breakdown
Navbar
Transparent on scroll start, morphs into clipped polygon nav pill on scroll. Shrinks logo into 3 animated SVG segments. Scrolled state: blurred overlay backdrop. Sub-nav expands vertically within the pill on trigger. Custom star-burst icon replaces hamburger.
Buttons (CTAs)
Accent-color: Transparent fill, 2px solid #EE3A17 border, 10px radius. On hover: bg sweeps in from right (clip-path animation). Contains custom animated triple-arrow SVG chevron. Color transitions: orange → dark background.
Cards
Floppy disk shape (custom clip-path polygon) as primary card format. Testimonials: clipped hexagonal shape. Portfolio list: full-bleed rows with floating thumbnail. Mission cards: large polygon-cropped panels. All use #EE3A17 @ 30% fill.
Forms & Inputs
Inputs: rounded 10px, #EE3A174D bg, 1px solid #EE3A17 border, 14px uppercase text. Placeholder: #EC5E2A. Submit: transparent + border, hover triggers bg sweep. Textarea: borderless, scrolls with mask-image bottom fade. Folder animation on form container open.
Hero
Large display headline + animated border box with corner crop lines + star ornaments. Scrolling text ticker at bottom. Animated CTA button. 3D model-viewer star (WebGL). Flying ship SVG floats as background element.
Footer
3-column: Social links + copyright / Astronaut crew illustration / Email sign-up form. Negative margin overlap from footer cards section. Clean, minimal. Dark bg continues. 14px small copyright text at 40% opacity.
06 Depth, Effects & Visual Enhancements
Shadows
No traditional box-shadows. Depth is created via SVG shadow overlays (custom `.svg` files) and gradient overlays on images. Layering through z-index + alpha.
Border Radius System
Almost entirely clip-path polygon shapes rather than border-radius. Rare uses: 10px on inputs, 5px on cookie bar, 2px on small indicators. Octagonal crop is the signature shape.
Glow & Effects
No CSS glow. Texture: dot-matrix SVG background (parallax). Backdrop-filter: blur(10px) on nav overlay. Duotone orange photography as visual texture. Star flash CSS keyframe animation.
Iconography
Custom SVG clip-path shapes: star (8-pointed), arrow chevrons, folder tabs. No icon library. All icons are CSS-drawn or SVG inline. Minimal, angular, military HUD aesthetic.
Photography
All images processed as orange duotone — single hue (#EE3A17 family) over dark base. Cinematic sci-fi subject matter (astronauts, spaceships, rockets). Consistent filter unifies diverse imagery.
3D / WebGL
model-viewer element renders a rotating 3D star GLB asset. Transparent background, auto-rotate, camera-controls disabled. One-of-a-kind depth layer in the hero section.
07 Interaction & Animation
Scroll Animations
Entrance complexity
9/10
Parallax usage
8/10
Horizontal scroll
Yes
Stagger timing
8/10
Motion Personality
Easing: cubic-bezier(0.87,0,0.13,1) — dramatic ease-in-out (signature curve)
Duration: 0.6–1.3s typical
Border reveals: clip-path inset animations
Folder open: scaleX then scaleY sequence
Card hover: translate + scale combo
Button hover: clip-path sweep (right-to-left bg)
Star: CSS keyframe pulse, scale 0→1→0
Scrolling ticker: JS-driven continuous translate
Microinteraction Highlights
Triple-arrow button chevron cascade Floppy disk hover lift + rotate Portfolio list row bg-swipe on hover Nav pill morph on scroll Dotmatrix BG parallax Animated border boxes (clip-path reveals) Content trail images follow cursor
08 Responsiveness Strategy
Breakpoints
Desktop: 1000px+
Tablet: 691–999px
Mobile: ≤690px
Body border removed on mobile (0px). HUD frame simplified to 5px bars.
Nav Collapse
No hamburger icon. Custom star-burst trigger expands a full-screen pill with oversized Sixsound-font menu items + social links in grid. Closes on outside tap.
Layout Shifts
Horizontal scroll sections → standard vertical stack. Floppy disk cards: 3-col → 1-col overlapping. Portfolio list: thumbnail becomes static left-anchored inline image. Font scaling: vw → px fallbacks.
09 Technical Estimation
Stack
WordPress + Salient/WPBakery Page Builder
Gravity Forms (contact forms)
model-viewer (Google WebGL library)
Flickity (carousel/ticker)
Lenis (smooth scroll)
Anime.js / waypoints.js (scroll triggers)
Custom child theme with heavy CSS override layer
CSS Methodology
BEM-adjacent class naming (WPBakery conventions)
Heavy use of CSS custom properties (--nectar-*, --section-count, --hover-easing)
clip-path shapes as primary design tool
CSS keyframe animations inline in dynamic stylesheet
Percentage-based padding for fluid vertical rhythm
Alpha transparency via hex 2-digit suffix
10 Rebuild Blueprint — Hero Example
// DARK STAR LABS — INTERACTIVE ANIMATIONS FOR THE SPACE INDUSTRY
INTERACTIVE
ANIMATIONS FOR
THE SPACE INDUSTRY
We build interactive animations that turn complex engineering into playable experiences. From funding to global missions.
COMMS   ▶▶▶
// Interactive Animations  ◆  Engaging Experiences  ◆  Creative Mini Games  ◆  Rendered Video Production  ◆  Sci-Fi Fans  ◆ 
Key tokens to replicate this aesthetic
/* === DSL Design Token Approximations === */
--bg-void:        #131314;
--bg-surface:     #1C1C1C;
--accent:         #EE3A17;
--accent-muted:   #EC5E2AB3;    /* ~70% alpha */
--accent-fill:    #EE3A174D;    /* ~30% alpha */
--accent-tertiary:#F7BD14;
--text-primary:   #E3E3E3;
--font-display:   'Sixsound-Regular', monospace;
--font-mono:      'IBM Plex Mono', monospace;
--ease-signature: cubic-bezier(0.87, 0, 0.13, 1);
--clip-oct: polygon(
  20px 0%, calc(100% - 20px) 0%,
  100% 20px, 100% calc(100% - 20px),
  calc(100% - 20px) 100%, 20px 100%,
  0% calc(100% - 20px), 0% 20px
);
Plain HTML/CSS approach
Use clip-path polygons on divs, CSS custom properties for tokens, @keyframes for star/border reveals, position:sticky for horizontal scroll illusion, IBM Plex Mono via Google Fonts.
Tailwind approach
Extend config: custom colors, custom easing. Use [clip-path:polygon(...)] arbitrary values. JIT mode for alpha colors. Require @layer utilities for clip-path reveal animations.
React approach
Framer Motion for clip-path/border reveals. CSS Modules or styled-components for token layer. Use IntersectionObserver hook for scroll-triggered `.animated-in` class toggle. model-viewer as web component.