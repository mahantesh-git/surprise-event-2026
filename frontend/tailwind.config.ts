import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Sutéra color system
      colors: {
        // Core palette
        'sutera-white': '#ffffff',
        'sutera-black': '#000000',
        'sutera-mark': '#a9a9a9',
        'sutera-grid': '#f2f2f2',
        'sutera-secondary': '#cbcbcb',
        
        // Project-specific accents (pastels)
        'accent-01': '#BCD4FD', // periwinkle
        'accent-02': '#E3C0A9', // terracotta
        'accent-03': '#C9C1FF', // lavender
        'accent-04': '#E88150', // burnt orange
        'accent-05': '#FFA796', // salmon
        'accent-06': '#F9CCDD', // blush pink
        'accent-07': '#91B394', // sage green
        'accent-08': '#59E7CA', // aqua/teal
        'accent-09': '#996B4A', // warm brown
      },

      // Spacing using viewport units
      spacing: {
        'svh-sm': 'clamp(2rem, 3.73svh, 4rem)',
        'svh-md': 'clamp(3rem, 7.46svh, 6rem)',
        'svh-lg': 'clamp(4rem, 11.19svh, 8rem)',
        'margin': 'clamp(1rem, 4vw, 4rem)',
        'gutter': 'clamp(0.5rem, 2vw, 1.5rem)',
      },

      // Border radius system
      borderRadius: {
        'pill': '52px',
        'technical': '2px',
        'subtle': '10px',
      },

      // Font sizing with clamp for fluid typography
      fontSize: {
        'xxs': 'clamp(8px, 0.8vw, 10px)',
        'xs': 'clamp(10px, 1vw, 12px)',
        's': 'clamp(11px, 1.1vw, 13px)',
        'sm': 'clamp(12px, 1.2vw, 14px)',
        'base': 'clamp(14px, 1.4vw, 16px)',
        'm': 'clamp(16px, 1.6vw, 18px)',
        'lg': 'clamp(18px, 1.8vw, 20px)',
        'l': 'clamp(20px, 2vw, 24px)',
        'xl': 'clamp(28px, 3vw, 36px)',
        'xxl': 'clamp(56px, 11vw, 160px)',
      },

      // Line height
      lineHeight: {
        'tight': '0.9',
        'technical': '0.84em',
        'normal': '1',
        'relaxed': '1.5',
        'generous': '1.6',
      },

      // Letter spacing
      letterSpacing: {
        'extreme': '-0.04em',
        'tight': '-0.02em',
        'normal': '0',
        'wide': '0.03em',
        'wider': '0.05em',
        'widest': '0.1em',
      },

      // Custom z-index
      zIndex: {
        'grid': '0',
        'content': '10',
        'overlay': '50',
        'modal': '100',
      },

      // Animation
      animation: {
        'path-draw': 'pathDraw 2s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },

      keyframes: {
        pathDraw: {
          'to': { strokeDashoffset: '0' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUp: {
          'from': { transform: 'translateY(10px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
      },

      // Opacity for careful layering
      opacity: {
        '5': '0.05',
        '7': '0.07',
        '10': '0.1',
        '70': '0.7',
      },
    },
  },
  plugins: [],
};

export default config;
