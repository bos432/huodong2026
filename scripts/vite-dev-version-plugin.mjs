import { execSync } from "node:child_process";

function gitCommit(root) {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || "local";
  } catch {
    return "local";
  }
}

export function devVersionPlugin(name, root) {
  return {
    name: `dev-version-${name}`,
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const expectedPath = name === "admin" ? "/admin/version.json" : "/version.json";
        if (req.url?.split("?", 1)[0] !== expectedPath) return next();
        const payload = {
          name,
          commit: process.env.VITE_BUILD_COMMIT || process.env.BUILD_COMMIT || gitCommit(root),
          buildTime: process.env.VITE_BUILD_TIME || process.env.BUILD_TIME || new Date().toISOString(),
          mode: "development"
        };
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(`${JSON.stringify(payload)}\n`);
      });
    }
  };
}
