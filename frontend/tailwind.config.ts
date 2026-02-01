import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(214.3 31.8% 91.4%)',
        background: 'hsl(210 40% 98%)',
        foreground: 'hsl(222.2 84% 4.9%)',
        card: 'hsl(0 0% 100%)'
      }
    }
  },
  plugins: []
};

export default config;

