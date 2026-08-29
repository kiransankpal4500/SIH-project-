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
          950: '#060B17', // Main background (deep abyssal)
          900: '#0B132B', // Dark card/panel background
          850: '#111C38', // Elevated card surface
          800: '#1C2541', // Border / subtle divider color
          700: '#2A3C5D', // Soft border / hover highlight
          600: '#3A506B', // Muted text/controls
          500: '#486581', // Secondary text
          400: '#00B4D8', // Primary Cyan Accent
          300: '#48CAE4', // Bright Cyan Highlight
          200: '#90E0EF', // Bioluminescent Cyan Text
          100: '#E0F7FA', // Crisp white-cyan text
        },
        risk: {
          low: '#10B981',      // Emerald Green
          medium: '#F59E0B',   // Amber
          high: '#F97316',     // Orange
          critical: '#EF4444', // Crimson Red
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
