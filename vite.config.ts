import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react-dom") || id.includes("react/jsx-runtime") || id.includes("react")) return "react";
          if (id.includes("react-router-dom")) return "router";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("leaflet")) return "leaflet";
          if (id.includes("embla-carousel")) return "carousel";
          if (id.includes("recharts")) return "charts";
          if (id.includes("lucide-react")) return "icons";

          return "vendor";
        },
      },
    },
  },
}));
