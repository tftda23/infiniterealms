import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			gold: {
  				DEFAULT: '#d4a84b',
  				light: '#e8c06a',
  				dark: '#b8942f',
  			},
  			parchment: {
  				DEFAULT: '#f4e4bc',
  				dark: '#e8d4a8'
  			},
  			realm: {
  				midnight: '#0d1117',
  				charcoal: '#161b22',
  				slate: '#1c2333',
  				ember: '#c9873b',
  				crimson: '#c75050',
  				emerald: '#3fb68b',
  				sapphire: '#539bf5',
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			sans: ['var(--font-nunito)', 'Nunito', 'system-ui', 'sans-serif'],
  			medieval: ['var(--font-cinzel)', 'Cinzel', 'Georgia', 'serif'],
  			cinzel: ['var(--font-cinzel)', 'Cinzel', 'Georgia', 'serif'],
  		},
  		keyframes: {
  			'fade-in': {
  				from: { opacity: '0', transform: 'translateY(8px)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  			shimmer: {
  				'0%': { backgroundPosition: '-200% center' },
  				'100%': { backgroundPosition: '200% center' },
  			},
  		},
  		animation: {
  			'fade-in': 'fade-in 0.4s ease-out',
  			shimmer: 'shimmer 3s ease-in-out infinite',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
