/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Nền gần trắng, viền mảnh (mockup 2026-09)
        canvas: '#F6F8FA',
        line: '#E6EBF1',
        ink: { DEFAULT: '#0F2A44', soft: '#5B6B7F', mute: '#8A97A8' },
        // Xanh lá đậm chủ đạo: CTA chính "Thực hiện ngay", "Thêm giao dịch", "Duyệt" = primary-700
        primary: { 50: '#E8F5EE', 100: '#CDEBDD', 200: '#A5DCC3', 500: '#1FA37A', 600: '#15845F', 700: '#0F5E45', 800: '#0B4A36', 900: '#083A2A' },
        // Xanh dương cho CTA phụ, link "Xem tất cả →"
        accent: { 50: '#EEF5FF', 100: '#DAE8FE', 500: '#4C8DF0', 600: '#2563EB', 700: '#1D4FC4' },
        success: { 50: '#E7F7EF', 100: '#CDEFDD', 500: '#1FA16B', 600: '#178A5A' },
        warning: { 50: '#FFF4E0', 100: '#FDE7C0', 500: '#F5A524', 600: '#D98A0B' },
        violet: { 50: '#F3EEFF', 100: '#E6DCFE', 500: '#8B5CF6', 600: '#7442E8' },
        danger: { 50: '#FDECEC', 100: '#FBD5D5', 500: '#EF4444', 600: '#DC2626' },
        // Badge pastel bổ sung (gộp sâu với bảng màu mặc định của Tailwind)
        rose: { 50: '#FFF1F3', 100: '#FFE0E6', 500: '#F43F5E', 600: '#E11D48' },
        amber: { 50: '#FFF7E8', 100: '#FDEBC8', 500: '#F59E0B', 600: '#C77A06' },
        sky: { 50: '#EEF7FF', 100: '#D9EEFE', 500: '#0EA5E9', 600: '#0284C7' },
        cream: '#FFF9EC',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.03)',
        soft: '0 6px 20px -12px rgba(15, 42, 68, 0.16)',
        lift: '0 10px 28px -14px rgba(15, 42, 68, 0.22)',
      },
      borderRadius: { xl: '12px', '2xl': '16px' },
    },
  },
  plugins: [],
}
