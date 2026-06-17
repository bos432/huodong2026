import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const apiProxyTarget = process.env.VITE_DEV_API_PROXY || "http://localhost:18080";

export default defineConfig({
  base: "./",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@activity/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": apiProxyTarget,
      "/uploads": apiProxyTarget
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@element-plus/icons-vue")) return "vendor-icons";
          if (id.includes("element-plus")) return "vendor-element-plus";
          if (id.includes("vue") || id.includes("vue-router")) return "vendor-vue";
          if (id.includes("axios")) return "vendor-http";
          return "vendor";
        }
      }
    }
  }
});
