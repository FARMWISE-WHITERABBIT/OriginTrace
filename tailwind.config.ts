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
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "mk-marquee": "mk-marquee-scroll 30s linear infinite",
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both",
        "fade-in": "fade-in 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both",
        "scale-in": "scale-in 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both",
      },
      maxWidth: {
        "mk-2xs": "42rem",
        "mk-xs":  "52rem",
        "mk-sm":  "60rem",
        "mk-md":  "72rem",
        "mk-lg":  "80rem",
        "mk-xl":  "86rem",
      },
      borderRadius: {
        pill: "9999px",
        card: "1rem",
        hero: "1.5rem",
      },
      fontSize: {
        "display-2xl": ["clamp(3rem,6vw,5rem)",     { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "800" }],
        "display-xl":  ["clamp(2.5rem,5vw,4rem)",   { lineHeight: "1.1",  letterSpacing: "-0.025em", fontWeight: "800" }],
        "display-lg":  ["clamp(2rem,4vw,3rem)",      { lineHeight: "1.15", letterSpacing: "-0.02em",  fontWeight: "700" }],
        "display-md":  ["clamp(1.75rem,3vw,2.25rem)",{ lineHeight: "1.2",  letterSpacing: "-0.015em", fontWeight: "700" }],
        "display-sm":  ["clamp(1.25rem,2vw,1.5rem)", { lineHeight: "1.3",  letterSpacing: "-0.01em",  fontWeight: "600" }],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
