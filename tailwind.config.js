/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0d1117",
        "bg-surface": "#161b22",
        "bg-elevated": "#21262d",
        "border-default": "#30363d",
        "border-muted": "#21262d",
        "text-primary": "#e6edf3",
        "text-secondary": "#8b949e",
        "text-muted": "#6e7681",
        "accent-blue": "#58a6ff",
        "accent-purple": "#a371f7",
        "accent-orange": "#ffa657",
        "accent-green": "#238636",
        "accent-green-light": "#2ea043",
        success: "#3fb950",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
