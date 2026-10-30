// Smart Polyhouse Application Vite Configuration
// Integrated Vite + TanStack Start SSR & Prerender Pipeline
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start bundled server entry to src/server.ts (SSR handler)
export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    server: { entry: "server" },
    prerender: {
      enabled: true,
      crawlLinks: true,
    },
  },
});
