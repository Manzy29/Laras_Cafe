import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cafe: {
          ivory: "#F7F0E3",      // Background
          oat: "#E2D0B0",        // Card surfaces
          rosewood: "#653A3E",   // Active/hover
          clay: "#925C49",       // Secondary buttons/tags
          espresso: "#2D191C",   // Deep text
          navy: "#263B50",       // Dark containers/navigation
          warmGrey: "#B6AAA0",   // Borders
          deepEspresso: "#452227", // Headers
          midnightNavy: "#001429"  // Feature cards
        }
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      }
    },
  },
  plugins: [],
};
export default config;