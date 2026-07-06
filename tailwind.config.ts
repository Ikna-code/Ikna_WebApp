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
      fontSize: {
        // Heading Sizes
        'heading-xl': ['3.5rem', { lineHeight: '1.1', fontWeight: '900' }], // 56px
        'heading-lg': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }], // 36px
        'heading-md': ['1.875rem', { lineHeight: '1.2', fontWeight: '700' }], // 30px
        'heading-sm': ['1.5rem', { lineHeight: '1.3', fontWeight: '700' }], // 24px
        'heading-xs': ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }], // 20px
        // Body Sizes
        'body-lg': ['1.125rem', { lineHeight: '1.75' }], // 18px
        'body-base': ['1rem', { lineHeight: '1.625' }], // 16px
        'body-sm': ['0.875rem', { lineHeight: '1.625' }], // 14px
        'body-xs': ['0.75rem', { lineHeight: '1.5' }], // 12px
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
    },
  },
};
export default config;