import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-sans)',    'ui-sans-serif',  'system-ui',  'sans-serif'],
        mono:    ['var(--font-mono)',    'ui-monospace',   'SFMono-Regular', 'monospace'],
        display: ['var(--font-display)', 'Inter Tight',   'var(--font-sans)', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        /* Marketing brand tokens */
        "mk-green":       "var(--mk-green)",
        "mk-green-dark":  "var(--mk-green-dark)",
        "mk-green-light": "var(--mk-green-light)",
        "mk-green-pale":  "var(--mk-green-pale)",
      },
      borderRadius: {
        lg:   "var(--radius)",
        md:   "calc(var(--radius) - 2px)",
        sm:   "calc(var(--radius) - 4px)",
        pill: "9999px",
        card: "1rem",
        hero: "1.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "mk-scroll":       "mk-scroll 28s linear infinite",
        "fade-in-up":      "anim-fade-in-up 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both",
        "fade-in":         "anim-fade-in 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both",
        "scale-in":        "anim-scale-in 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both",
      },
      maxWidth: {
        "mk-2xs": "36rem",    /* 576px */
        "mk-xs":  "44rem",    /* 704px */
        "mk-sm":  "61.25rem", /* 980px — Mivora .container-small */
        "mk-md":  "75rem",    /* 1200px */
        "mk-lg":  "86.875rem",/* 1390px — Mivora .container */
      },
      fontSize: {
        "display-2xl": ["clamp(2.75rem,6vw,5rem)",    { lineHeight: "1.03", letterSpacing: "-0.035em", fontWeight: "800" }],
        "display-xl":  ["clamp(2.25rem,5vw,3.75rem)", { lineHeight: "1.07", letterSpacing: "-0.03em",  fontWeight: "800" }],
        "display-lg":  ["clamp(1.875rem,4vw,3rem)",   { lineHeight: "1.12", letterSpacing: "-0.025em", fontWeight: "700" }],
        "display-md":  ["clamp(1.5rem,3vw,2.25rem)",  { lineHeight: "1.18", letterSpacing: "-0.02em",  fontWeight: "700" }],
        "display-sm":  ["clamp(1.125rem,2vw,1.5rem)", { lineHeight: "1.28", letterSpacing: "-0.015em", fontWeight: "600" }],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
