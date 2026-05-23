// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        ikna: {
          dark: '#1A1A1A',     // Primary Text, Headings
          muted: '#707070',    // Subheadings, Descriptions
          brown: '#8D6E63',    // Buttons, Highlights (e.g., Brown buttons)
          'brown-light': '#D7CCC8', // Size chart hover, light accents
          beige: '#FDF8F5',    // Main Background
          cream: '#FFF1E0',    // Secondary background blocks
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'serif'], // Elegant Headings
        sans: ['var(--font-sans)', 'sans-serif'], // Body text
      },
    },
  },
};
export default config;