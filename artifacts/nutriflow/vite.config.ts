import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
let port = 5173;
if (rawPort) {
  const parsedPort = Number(rawPort);
  if (!isNaN(parsedPort) && parsedPort > 0) {
    port = parsedPort;
  }
}

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  define: {
    // Supabase credentials are loaded from environment variables.
    // For local development: create a .env.local file (see .env.example).
    // For production: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment environment.
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || ""),
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""),
  },

  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
