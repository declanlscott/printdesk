import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5174 },
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tanstackStart(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    cloudflare({
      viteEnvironment: { name: "ssr" },
      configPath: process.env.SST_WRANGLER_PATH,
    }),
  ],
});
