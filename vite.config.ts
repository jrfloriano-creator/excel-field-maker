import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
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
      // Gera SW automaticamente com Workbox
      strategies: "generateSW",
      registerType: "autoUpdate",
      // O manifest.json já está em public/, não gerar novo
      manifest: false,
      // Habilita suporte a Dev (modo development)
      devOptions: {
        enabled: mode === "development",
        type: "module",
      },
      workbox: {
        // Pré-cache de todos os assets estáticos do build
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot,json}",
        ],
        globIgnores: ["**/node_modules/**/*", "sw.js", "workbox-*.js"],
        // SPA: redirecionar qualquer navegação para index.html
        navigateFallback: "index.html",
        // Não interceptar rotas de API ou arquivos com extensão específica
        navigateFallbackDenylist: [/^\/api\//, /\.[^/?]+$/],
        // Limpeza de cache antigo ao atualizar SW
        cleanupOutdatedCaches: true,
        // Não esperar – ativa o SW imediatamente
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // Cache-first para assets estáticos (imagens, fontes, etc.)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|webp|avif)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache-first para fontes Google
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // StaleWhileRevalidate para scripts e estilos externos
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
              },
            },
          },
          // NetworkFirst para requisições de dados externos (CDNs, APIs)
          {
            urlPattern: /^https:\/\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "external-resources",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
