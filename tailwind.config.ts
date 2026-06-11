import type { Config } from 'tailwindcss'

const config: Config = {
  // Donkere modus volgt de in-app thema-keuze (html.dark via A11yProvider), niet de
  // OS-voorkeur. Zonder dit volgen `dark:`-klassen de media-query en raken ze los van
  // het app-thema (licht thema + OS-donker gaf lichte tekst op lichte achtergrond).
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Page background
        canvas: '#F6F8FA',
        // Card border
        cardborder: '#E8EDF2',
        // Green main accent
        brand: {
          DEFAULT: '#35B558',
          dark: '#2C9A4A',
          light: '#E9F7EE',
        },
        // Soft pastel card backgrounds
        weather: '#EAF5FF',
        ai: '#F5EDFF',
        // Orange stock accent
        stock: '#FF8A1F',
      },
      borderRadius: {
        card: '24px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 24, 39, 0.04), 0 6px 16px rgba(17, 24, 39, 0.04)',
        soft: '0 10px 28px rgba(17, 24, 39, 0.08)',
      },
    },
  },
  plugins: [],
}

export default config
