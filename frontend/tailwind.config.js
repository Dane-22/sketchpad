/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "scroll-up": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" }
        },
        "scroll-down": {
          "0%": { transform: "translateY(-50%)" },
          "100%": { transform: "translateY(0)" }
        },
        "shimmer": {
          "100%": { transform: "translateX(100%)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "scroll-up": "scroll-up 20s linear infinite",
        "scroll-down": "scroll-down 25s linear infinite",
        "shimmer": "shimmer 1.5s infinite"
      },
      colors: {
        theme: {
          main: 'var(--bg-main)',
          surface: 'var(--bg-surface)',
          border: 'var(--border-color)',
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          accent: 'var(--accent)',
          hover: 'var(--hover-bg)',
          grid: 'var(--grid-color)',
        }
      }
    },
  },
  plugins: [],
}
