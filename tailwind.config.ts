import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-alt": "var(--surface-alt)",
        muted: "var(--muted)",
        border: "var(--border)",
        accent: {
          red: "#E53E3E",
          magenta: "#D53F8C",
          pink: "#ED64A6",
        },
        cta: {
          from: "#E53E3E",
          to: "#D53F8C",
        },
      },
      fontFamily: {
        hoodlrz: ["var(--font-hoodlrz)", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0px",
        none: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
        full: "9999px",
      },
      keyframes: {
        "cta-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 8px rgba(229, 62, 62, 0.4), 0 0 16px rgba(213, 63, 140, 0.2)",
          },
          "50%": {
            boxShadow:
              "0 0 20px rgba(229, 62, 62, 0.6), 0 0 40px rgba(213, 63, 140, 0.4)",
          },
        },
        "cta-scale": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        glitch: {
          "0%": {
            clipPath: "inset(40% 0 61% 0)",
            transform: "translate(-2px, 2px)",
          },
          "20%": {
            clipPath: "inset(92% 0 1% 0)",
            transform: "translate(1px, -1px)",
          },
          "40%": {
            clipPath: "inset(43% 0 1% 0)",
            transform: "translate(-1px, 2px)",
          },
          "60%": {
            clipPath: "inset(25% 0 58% 0)",
            transform: "translate(2px, 1px)",
          },
          "80%": {
            clipPath: "inset(54% 0 7% 0)",
            transform: "translate(-2px, -1px)",
          },
          "100%": {
            clipPath: "inset(58% 0 43% 0)",
            transform: "translate(1px, 2px)",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        "cta-glow": "cta-glow 2.5s ease-in-out infinite",
        "cta-scale": "cta-scale 2.5s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "slide-in-right": "slide-in-right 0.4s ease-out forwards",
        "scan-line": "scan-line 1.5s ease-in-out",
        glitch: "glitch 0.3s ease-in-out",
        shimmer: "shimmer 2s linear infinite",
        "gradient-shift": "gradient-shift 4s ease infinite",
      },
      backgroundImage: {
        "cta-gradient": "linear-gradient(135deg, #E53E3E, #D53F8C)",
        "cta-gradient-hover": "linear-gradient(135deg, #C53030, #B83280)",
      },
    },
  },
  plugins: [],
};

export default config;
