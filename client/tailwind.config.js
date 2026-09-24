/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F4F8FB',
        line: '#E8EEF4',
        ink: { DEFAULT: '#0F2A44', soft: '#5B6B7F', mute: '#8A97A8' },
        primary: { 50: '#E6F4EF', 100: '#CDEBE0', 500: '#1FA37A', 600: '#128466', 700: '#0E6B58', 800: '#0B5647' },
        accent: { 50: '#EAF3FF', 100: '#D6E7FF', 500: '#4C8DF0', 600: '#2F7BEA', 700: '#1F63C7' },
        success: { 50: '#E7F7EF', 500: '#1FA16B', 600: '#178A5A' },
        warning: { 50: '#FFF4E0', 500: '#F5A524', 600: '#D98A0B' },
        violet: { 50: '#F1ECFF', 500: '#8B5CF6', 600: '#7442E8' },
        danger: { 50: '#FDECEC', 500: '#EF4444', 600: '#DC2626' },
        cream: '#FFF9EC',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 42, 68, 0.04), 0 1px 1px rgba(15, 42, 68, 0.02)',
        lift: '0 8px 24px -12px rgba(15, 42, 68, 0.18)',
      },
      borderRadius: { '2xl': '16px' },
    },
  },
  plugins: [],
}
