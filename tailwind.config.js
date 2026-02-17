/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/**/*.{js,ts,jsx,tsx}',
    './src/renderer/index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ["'SF Mono'", "'Fira Code'", 'monospace'],
      },
      colors: {
        // Light theme tokens
        'bg': 'var(--color-bg)',
        'bg-subtle': 'var(--color-bg-subtle)',
        'bg-hover': 'var(--color-bg-hover)',
        'bg-active': 'var(--color-bg-active)',
        'bg-panel': 'var(--color-bg-panel)',
        'bg-card': 'var(--color-bg-card)',
        'border-default': 'var(--color-border)',
        'border-subtle': 'var(--color-border-subtle)',
        'text-default': 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        'accent': 'var(--color-accent)',
        'accent-subtle': 'var(--color-accent-subtle)',
        'positive': 'var(--color-green)',
        'negative': 'var(--color-red)',
        'warning': 'var(--color-orange)',
        'purple': 'var(--color-purple)',

        // Category colors (fixed)
        'cat-groceries': '#16A34A',
        'cat-food': '#EA580C',
        'cat-shopping': '#7C3AED',
        'cat-gas': '#0891B2',
        'cat-entertainment': '#DB2777',
        'cat-bills': '#2563EB',
        'cat-travel': '#CA8A04',
        'cat-health': '#059669',
        'cat-personal': '#6366F1',
      },
      fontSize: {
        'page-title': ['20px', { lineHeight: '1.2', fontWeight: '650', letterSpacing: '-0.02em' }],
        'section-header': ['12px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.03em' }],
        'body': ['13px', { lineHeight: '1.5', fontWeight: '440' }],
        'secondary': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        'caption': ['11px', { lineHeight: '1.3', fontWeight: '500', letterSpacing: '0.04em' }],
        'label': ['10px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '10px',
      },
      boxShadow: {
        'default': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'elevated': '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'elevated-dark': '0 4px 12px rgba(0,0,0,0.4)',
      },
      animation: {
        'slide-in': 'slideIn 0.15s ease',
        'slide-down': 'slideDown 0.2s ease',
        'fade-in': 'fadeIn 0.15s ease',
      },
      keyframes: {
        slideIn: {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      width: {
        'sidebar': '232px',
        'side-panel': '340px',
      },
      minWidth: {
        'sidebar': '232px',
        'side-panel': '340px',
      },
    },
  },
  plugins: [],
}
