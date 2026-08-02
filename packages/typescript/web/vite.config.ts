import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import stylex from "@stylexjs/unplugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173 },
  resolve: { tsconfigPaths: true },
  optimizeDeps: { exclude: ["@printdesk/ui"] },
  ssr: { optimizeDeps: { exclude: ["@printdesk/ui"] } },
  plugins: [
    stylex.vite({
      useCSSLayers: true,
      unstable_moduleResolution: { type: "commonJS" },
      devMode: "css-only",
    }),
    tailwindcss(),
    devtools(),
    tanstackStart({ spa: { enabled: true } }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    cloudflare(),
  ],
});
