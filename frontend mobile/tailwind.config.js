/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#FAF9F6", // off white

        primary: {
          100: "#4b7b6f",
          200: "#CCD5AE",
          300: "#E9EDC9",
          400: "#FEFAE0",
        },

        secondary: {
          100: "#D4A373",
          200: "#FAEDCD",
        },
      },
    },
  },
  plugins: [],
};
