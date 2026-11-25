/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0a0a0a',
          surface: '#111111',
          card: '#141414',
          border: '#1e1e1e',
          'border-hover': '#2a2a2a',
        },
        neon: {
          green: '#10b981',
          'green-dim': '#059669',
          'green-glow': '#34d399',
        },
        accent: {
          red: '#ef4444',
          'red-dim': '#dc2626',
          amber: '#f59e0b',
          blue: '#3b82f6',
        },
        slate: {
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
