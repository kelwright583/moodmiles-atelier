import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icons/*.png"],
      manifest: {
        name: "Concierge Styled",
        short_name: "Concierge",
        description: "Arrive Impeccably Everywhere — AI travel wardrobe planning",
        start_url: "/",
        display: "standalone",
        background_color: "#151311",
        theme_color: "#ca975c",
        orientation: "portrait",
        icons: [
          { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
          { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/hwykcvpcwpaiotatzise\.supabase\.co\/storage/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "supabase-images", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 } },
          },
          {
            urlPattern: /^https:\/\/hwykcvpcwpaiotatzise\.supabase\.co\/functions/,
            handler: "NetworkFirst",
            options: { cacheName: "edge-functions", expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 } },
          },
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-maps", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 } },
          },
        ],
        navigateFallback: "/index.html",
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
