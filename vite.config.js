import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyAssetLinks() {
  return {
    name: "copy-assetlinks",
    closeBundle() {
      const src = path.resolve(__dirname, "public/.well-known/assetlinks.json");
      const destDir = path.resolve(__dirname, "dist/.well-known");
      if (fs.existsSync(src)) {
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(src, path.join(destDir, "assetlinks.json"));
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    copyAssetLinks(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "我的記帳本",
        short_name: "記帳本",
        description: "簡單好用的個人記帳 App",
        theme_color: "#7F77DD",
        background_color: "#f9fafb",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
