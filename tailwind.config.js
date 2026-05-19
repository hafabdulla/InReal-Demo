/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{js,jsx}',
		'./components/**/*.{js,jsx}',
		'./app/**/*.{js,jsx}',
		'./src/**/*.{js,jsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		screens: {
			'sm': '640px',
			'md': '768px',
			'lg': '1024px',
			'nav': '1100px',
			'xl': '1280px',
			'2xl': '1536px',
		},
		extend: {
      fontFamily: {
        ubuntu: ['Ubuntu', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Ubuntu Mono', 'JetBrains Mono', 'monospace'],
      },
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
				'primary-accent': '#00CED1',
				'black': '#000000',
				'charcoal-black': '#0E0E0E',
				'deep-graphite': '#1C1C1C',
				'modern-grey': '#2B2B2B',
				'off-white': '#F5F5F5',
				'steel-blue': '#00A3A6',
				'slate-grey': '#8C8C8C',
				'ir-dark': '#121212',
				'ir-white': '#FFFFFF',
				'ir-teal': '#01CED1',
				'ir-teal-muted': '#00A3A6',
				'ir-positive': '#22C55E',
				'ir-negative': '#EF4444',
				'ir-caution': '#FBBF24',
				'ir-border-dark': '#2D2D2D',
				'ir-border-light': '#E5E5E5',
				'ir-surface-light': '#F9FAFB',
				'ir-text-secondary': '#9CA3AF',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
};