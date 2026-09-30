/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      colors: {
        ivory: {
          DEFAULT: '#F7F5F0',
          canvas: '#F7F5F0',
          surface: '#FBFAF7',
          border: '#E5E1D8',
          'border-light': '#EEEAE3',
        },
        ink: {
          DEFAULT: '#172033',
          primary: '#172033',
          secondary: '#667085',
          muted: '#98A2B3',
        },
        cobalt: {
          DEFAULT: '#3157D5',
          hover: '#2648BE',
          soft: '#E9EEFF',
          dark: '#1D3B99',
        },
        amber: {
          DEFAULT: '#FFB547',
          warning: '#C77B16',
          soft: '#FFF4DE',
          'warning-soft': '#FFF3DC',
        },
        status: {
          success: '#238B5A',
          'success-bg': '#E8F6EF',
          'success-border': '#C8EBD9',
          warning: '#C77B16',
          'warning-bg': '#FFF3DC',
          'warning-border': '#FDE4B3',
          danger: '#D64545',
          'danger-bg': '#FDECEC',
          'danger-border': '#FAD1D1',
        }
      },
      borderRadius: {
        'enterprise': '7px',
        'card': '9px',
      }
    },
  },
  plugins: [],
}
