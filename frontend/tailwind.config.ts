import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./server/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070710",
        panel: "#12111f",
        "panel-soft": "#1b1830",
        line: "rgba(255,255,255,0.12)",
        mint: "#5cffd1",
        violet: "#a78bfa",
        coral: "#ff6b8a",
        sun: "#ffd166",
        berry: "#ff4fd8",
        sky: "#70d6ff"
      },
      boxShadow: {
        glow: "0 24px 90px rgba(92, 255, 209, 0.18)",
        pop: "0 22px 70px rgba(255, 79, 216, 0.2)"
      }
    }
  },
  plugins: []
};

export default config;
