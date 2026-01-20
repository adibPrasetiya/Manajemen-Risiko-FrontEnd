/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: "#4c6ef5",   // Indigo 6
        secondary: "#20c997", // Teal 5
        bg: "#f8f9fa",        // Gray 0
        sidebar: {
          DEFAULT: "#1e2433",
          dark: "#171c28",
          border: "#2d3548",
          text: "#e2e8f0",
          muted: "#94a3b8",
          hover: "#252d3f",
          active: "#3b4a6b",
        },
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
};
