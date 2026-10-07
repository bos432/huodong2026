import { fileURLToPath, URL } from "node:url";
import uniPlugin from "@dcloudio/vite-plugin-uni";
import { defineConfig } from "vite";
import { devVersionPlugin } from "../../scripts/vite-dev-version-plugin.mjs";

const uni = (uniPlugin as any).default || (uniPlugin as any).uni || uniPlugin;
const apiProxyTarget = process.env.VITE_DEV_API_PROXY || "http://127.0.0.1:3000";

export default defineConfig({
  plugins: [uni(), devVersionPlugin("h5", fileURLToPath(new URL("..", import.meta.url)))],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@activity/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": apiProxyTarget,
      "/uploads": apiProxyTarget
    }
  }
});
