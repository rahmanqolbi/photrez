/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [solidPlugin(), tailwindcss(), tsconfigPaths()],

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    css: true,
  },

  // Prevent vite from obscuring rust errors
  clearScreen: false,

  // Tauri expects a fixed port, fail if that port is already in use
  server: {
    strictPort: true,
    port: 1420,
    host: "0.0.0.0"
  },

  // to make use of `TAURI_PLATFORM`, `TAURI_ARCH`, `TAURI_FAMILY`,
  // `TAURI_PLATFORM_VERSION`, `TAURI_PLATFORM_TYPE` and `TAURI_DEBUG`
  // env variables in vite
  envPrefix: ["VITE_", "TAURI_"],

  build: {
    // Tauri supports es2021, but esnext ensures latest features work without transform errors
    target: "esnext",
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
