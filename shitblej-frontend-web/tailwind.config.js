/** @type {import('tailwindcss').Config} */
export default {
  // Follow the operating-system colour scheme (no in-app theme toggle).
  darkMode: "media",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand accent — the PDP green. Exposed as a scale so tokens stay semantic.
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      // Container width matches the PDP's max-w-6xl.
      maxWidth: {
        container: "72rem", // 1152px
      },
      borderRadius: {
        card: "1rem", // 16px — standard card
        "card-lg": "1.5rem", // 24px — hero / sheets
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.12)",
        "card-hover": "0 8px 40px -12px rgba(0,0,0,0.25)",
        brand: "0 10px 30px -10px rgba(34,197,94,0.45)",
        overlay: "0 24px 60px -18px rgba(0,0,0,0.35)",
      },
      transitionTimingFunction: {
        // Smooth, premium easing used across motion.
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        250: "250ms",
      },
      keyframes: {
        "slide-up": {
          from: { transform: "translateY(16px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.97)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "overlay-in": {
          from: { transform: "translateY(-8px) scale(0.99)", opacity: "0" },
          to: { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "heart-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.35)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)" },
        },
        // Loading indicators reveal late on purpose - see `loader-in` below.
        "loader-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        // prefers-reduced-motion substitute for the spinner: the arc still
        // signals "working" by breathing rather than travelling.
        "loader-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.5s cubic-bezier(0.22,1,0.36,1) forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22,1,0.36,1) forwards",
        "overlay-in": "overlay-in 0.22s cubic-bezier(0.22,1,0.36,1) forwards",
        "heart-pop": "heart-pop 0.35s cubic-bezier(0.22,1,0.36,1)",
        // The 240ms delay is the point: most loads finish inside it, so a
        // spinner never flashes for work the user did not perceive as waiting.
        // `both` holds opacity 0 through the delay instead of painting first.
        "loader-in": "loader-in 200ms ease-out 240ms both",
        "loader-pulse": "loader-pulse 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
