/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          primary: '#0B84C6',  // Core Ocean Blue
          cyan: '#16B8D4',     // Ocean Cyan
          dark: '#085A8A',     // Deep Blue hover
          light: '#E0F2FE',    // Very light blue tint
          navy: '#172033',     // Slate navy for high contrast
        },
        surface: {
          base: '#FFFFFF',     // Main background
          subtle: '#F7F9FC',   // Secondary background
          card: '#FFFFFF',     // Card surface
          border: '#E2E8F0',   // Clean border
          divider: '#F1F5F9',  // Subtle divider
          hover: '#F8FAFC',    // Row / card hover
        },
        text: {
          primary: '#172033',   // Slate 900
          secondary: '#64748B', // Slate 500
          muted: '#94A3B8',     // Slate 400
        },
        risk: {
          low: '#16A34A',       // Forest Emerald Green
          medium: '#F59E0B',    // Amber
          high: '#EA580C',      // Orange
          critical: '#DC2626',  // Red
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 2px 10px rgba(15, 23, 42, 0.06)',
        cardHover: '0 4px 16px rgba(15, 23, 42, 0.09)',
        dropdown: '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
      },
      borderRadius: {
        card: '12px',
      }
    },
  },
  plugins: [],
}
