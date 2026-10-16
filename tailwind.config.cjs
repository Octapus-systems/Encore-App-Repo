/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, `${i / 100}`])),
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			'button-end': 'rgb(var(--encore-button-end) / <alpha-value>)',
  			'button-mid': 'rgb(var(--encore-button-mid) / <alpha-value>)',
  			'error': 'rgb(var(--encore-error) / <alpha-value>)',
  			'error-container': 'rgb(var(--encore-error-container) / <alpha-value>)',
  			'inverse-on-surface': 'rgb(var(--encore-inverse-on-surface) / <alpha-value>)',
  			'inverse-primary': 'rgb(var(--encore-inverse-primary) / <alpha-value>)',
  			'inverse-surface': 'rgb(var(--encore-inverse-surface) / <alpha-value>)',
  			'on-background': 'rgb(var(--encore-on-background) / <alpha-value>)',
  			'on-error': 'rgb(var(--encore-on-error) / <alpha-value>)',
  			'on-error-container': 'rgb(var(--encore-on-error-container) / <alpha-value>)',
  			'on-primary': 'rgb(var(--encore-on-primary) / <alpha-value>)',
  			'on-primary-container': 'rgb(var(--encore-on-primary-container) / <alpha-value>)',
  			'on-primary-fixed': 'rgb(var(--encore-on-primary-fixed) / <alpha-value>)',
  			'on-primary-fixed-variant': 'rgb(var(--encore-on-primary-fixed-variant) / <alpha-value>)',
  			'on-secondary': 'rgb(var(--encore-on-secondary) / <alpha-value>)',
  			'on-secondary-container': 'rgb(var(--encore-on-secondary-container) / <alpha-value>)',
  			'on-secondary-fixed': 'rgb(var(--encore-on-secondary-fixed) / <alpha-value>)',
  			'on-secondary-fixed-variant': 'rgb(var(--encore-on-secondary-fixed-variant) / <alpha-value>)',
  			'on-surface': 'rgb(var(--encore-on-surface) / <alpha-value>)',
  			'on-surface-variant': 'rgb(var(--encore-on-surface-variant) / <alpha-value>)',
  			'on-tertiary': 'rgb(var(--encore-on-tertiary) / <alpha-value>)',
  			'on-tertiary-container': 'rgb(var(--encore-on-tertiary-container) / <alpha-value>)',
  			'on-tertiary-fixed': 'rgb(var(--encore-on-tertiary-fixed) / <alpha-value>)',
  			'on-tertiary-fixed-variant': 'rgb(var(--encore-on-tertiary-fixed-variant) / <alpha-value>)',
  			'outline': 'rgb(var(--encore-outline) / <alpha-value>)',
  			'outline-variant': 'rgb(var(--encore-outline-variant) / <alpha-value>)',
  			'primary-container': 'rgb(var(--encore-primary-container) / <alpha-value>)',
  			'primary-fixed': 'rgb(var(--encore-primary-fixed) / <alpha-value>)',
  			'primary-fixed-dim': 'rgb(var(--encore-primary-fixed-dim) / <alpha-value>)',
  			'secondary-container': 'rgb(var(--encore-secondary-container) / <alpha-value>)',
  			'secondary-fixed': 'rgb(var(--encore-secondary-fixed) / <alpha-value>)',
  			'secondary-fixed-dim': 'rgb(var(--encore-secondary-fixed-dim) / <alpha-value>)',
  			'surface-bright': 'rgb(var(--encore-surface-bright) / <alpha-value>)',
  			'surface-container': 'rgb(var(--encore-surface-container) / <alpha-value>)',
  			'surface-container-high': 'rgb(var(--encore-surface-container-high) / <alpha-value>)',
  			'surface-container-highest': 'rgb(var(--encore-surface-container-highest) / <alpha-value>)',
  			'surface-container-low': 'rgb(var(--encore-surface-container-low) / <alpha-value>)',
  			'surface-container-lowest': 'rgb(var(--encore-surface-container-lowest) / <alpha-value>)',
  			'surface-dim': 'rgb(var(--encore-surface-dim) / <alpha-value>)',
  			'surface-tint': 'rgb(var(--encore-surface-tint) / <alpha-value>)',
  			'surface-variant': 'rgb(var(--encore-surface-variant) / <alpha-value>)',
  			'tertiary': 'rgb(var(--encore-tertiary) / <alpha-value>)',
  			'tertiary-container': 'rgb(var(--encore-tertiary-container) / <alpha-value>)',
  			'tertiary-fixed': 'rgb(var(--encore-tertiary-fixed) / <alpha-value>)',
  			'tertiary-fixed-dim': 'rgb(var(--encore-tertiary-fixed-dim) / <alpha-value>)',
  			'visa': 'rgb(var(--encore-visa) / <alpha-value>)',
  			brand: 'hsl(var(--primary))',
  			ink: 'hsl(var(--ink))',
  			charcoal: 'hsl(var(--charcoal))',
  			surface: 'hsl(var(--surface))',
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontSize: {
  			'display-hero': ['40px', { lineHeight: '48px', fontWeight: '800' }],
  			'headline-lg': ['28px', { lineHeight: '36px', fontWeight: '700' }],
  			'headline-md': ['22px', { lineHeight: '30px', fontWeight: '700' }],
  			'headline-sm': ['18px', { lineHeight: '24px', fontWeight: '600' }],
  			'body-lg': ['16px', { lineHeight: '24px', fontWeight: '500' }],
  			'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
  			'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
  			'label-lg': ['15px', { lineHeight: '20px', fontWeight: '700' }],
  			'label-md': ['13px', { lineHeight: '18px', fontWeight: '600' }],
  			'label-sm': ['11px', { lineHeight: '14px', fontWeight: '700' }]
  		},
  		spacing: {
  			margin: '1.25rem', gutter: '1rem', 'space-xs': '.25rem', 'space-sm': '.5rem', 'space-md': '1rem', 'space-lg': '1.5rem', 'space-xl': '2rem'
  		},
  		fontFamily: {
  			'display-hero': ['"Plus Jakarta Sans"', 'sans-serif'],
  			'headline-lg': ['"Plus Jakarta Sans"', 'sans-serif'],
  			'headline-md': ['"Plus Jakarta Sans"', 'sans-serif'],
  			'headline-sm': ['"Plus Jakarta Sans"', 'sans-serif'],
  			'body-lg': ['"Plus Jakarta Sans"', 'sans-serif'],
  			'body-md': ['"Plus Jakarta Sans"', 'sans-serif'],
  			'body-sm': ['"Plus Jakarta Sans"', 'sans-serif'],
  			'label-lg': ['"Plus Jakarta Sans"', 'sans-serif'],
  			'label-md': ['"Plus Jakarta Sans"', 'sans-serif'],
  			'label-sm': ['"Plus Jakarta Sans"', 'sans-serif'],
  			heading: ['var(--font-heading)'],
  			body: ['var(--font-body)'],
  			display: ['var(--font-display)'],
  			mono: ['var(--font-mono)']
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'slide-up': {
  				from: {
  					transform: 'translateY(16px)',
  					opacity: '0'
  				},
  				to: {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			'fade-in': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			'shimmer': {
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'slide-up': 'slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
  			'fade-in': 'fade-in 0.4s ease-out',
  			'shimmer': 'shimmer 1.6s infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
