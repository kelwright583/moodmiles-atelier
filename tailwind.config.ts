import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        heading: ['Cormorant Garamond', 'Georgia', 'serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        border:       "hsl(var(--border))",
        input:        "hsl(var(--input))",
        ring:         "hsl(var(--ring))",
        background:   "hsl(var(--background))",
        foreground:   "hsl(var(--foreground))",
        primary:      { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary:    { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive:  { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted:        { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent:       { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover:      { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card:         { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        gold:         { DEFAULT: "hsl(var(--gold))", dim: "hsl(var(--gold-dim))", glow: "hsl(var(--gold-glow))" },
        parchment:    { DEFAULT: "hsl(var(--parchment))", dim: "hsl(var(--parchment-dim))", faint: "hsl(var(--parchment-faint))" },
        ink:          { DEFAULT: "hsl(var(--ink))", deep: "hsl(var(--ink-deep))", raised: "hsl(var(--ink-raised))", border: "hsl(var(--ink-border))" },
        live:         { DEFAULT: "hsl(var(--live))", dim: "hsl(var(--live-dim))", text: "hsl(var(--live-text))" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-up":        { "0%": { opacity: "0", transform: "translateY(24px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in":        { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "ken-burns":      { "0%": { transform: "scale(1)" }, "100%": { transform: "scale(1.06)" } },
        shimmer:          { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(100%)" } },
        "pulse-dot":      { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-up":        "fade-up 0.7s ease-out forwards",
        "fade-in":        "fade-in 0.9s ease-out forwards",
        "ken-burns":      "ken-burns 18s ease-in-out infinite alternate",
        shimmer:          "shimmer 2s ease-in-out infinite",
        "pulse-dot":      "pulse-dot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
