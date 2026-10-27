/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FAF9F6',
        panel: '#EDE4D3',
        card: '#FFFFFF',
        primary: {
          DEFAULT: '#14532D',
          hover: '#0f3f22',
          light: '#e8f2ec',
        },
        heading: '#18352A',
        border: '#DED8CC',
        secondary: '#686B63',
        warning: '#B7791F',
        critical: '#B42318',
        chart: {
          green: '#14532D',
          olive: '#5E6E1E',
          ochre: '#B8860B',
          brick: '#A04028',
          clay: '#C06C42',
          sage: '#4A7C59',
          charcoal: '#2B2D2F',
          sand: '#8C7355',
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '4px',
        md: '6px',
        lg: '6px',
      },
      spacing: {
        grid: '8px',
      }
    },
  },
  plugins: [],
}
