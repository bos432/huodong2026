import fs from "node:fs";

const failures = [];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function checkSourceIncludes(source, needle, label) {
  check(source.includes(needle), `${label} must include ${needle}.`);
}

function locationBlock(conf, locationPattern) {
  const index = conf.search(locationPattern);
  if (index < 0) return "";
  const open = conf.indexOf("{", index);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < conf.length; i += 1) {
    if (conf[i] === "{") depth += 1;
    if (conf[i] === "}") {
      depth -= 1;
      if (depth === 0) return conf.slice(open + 1, i);
    }
  }
  return "";
}

const conf = read("deploy/nginx/default.conf");
const compose = read("docker-compose.yml");
const preflight = read("scripts/preflight.mjs");
const checklist = read("docs/launch-checklist.md");
const progress = read("docs/project-progress.md");

const apiLocation = locationBlock(conf, /location\s+\/api\//);
const uploadsLocation = locationBlock(conf, /location\s+\^~\s+\/uploads\//);
const staticLocation = locationBlock(conf, /location\s+~\*/);
const adminLocation = locationBlock(conf, /location\s+\^~\s+\/admin\//);
const h5Location = locationBlock(conf, /location\s+\/\s*\{/);

checkSourceIncludes(conf, "server_tokens off", "Nginx config");
checkSourceIncludes(conf, "root /usr/share/nginx/h5;", "Nginx config");
checkSourceIncludes(conf, "client_max_body_size 20m", "Nginx config");
checkSourceIncludes(conf, "gzip on", "Nginx config");
checkSourceIncludes(conf, "X-Content-Type-Options", "Nginx config");
checkSourceIncludes(conf, "X-Frame-Options", "Nginx config");
checkSourceIncludes(conf, "Referrer-Policy", "Nginx config");
checkSourceIncludes(conf, "Permissions-Policy", "Nginx config");

check(Boolean(apiLocation), "Nginx config must define location /api/.");
checkSourceIncludes(apiLocation, "proxy_pass http://api:3000/api/;", "Nginx /api location");
checkSourceIncludes(apiLocation, "proxy_http_version 1.1;", "Nginx /api location");
checkSourceIncludes(apiLocation, "proxy_hide_header X-Content-Type-Options;", "Nginx /api location");
checkSourceIncludes(apiLocation, "proxy_hide_header X-Frame-Options;", "Nginx /api location");
checkSourceIncludes(apiLocation, "proxy_set_header Host $host;", "Nginx /api location");
checkSourceIncludes(apiLocation, "proxy_set_header X-Real-IP $remote_addr;", "Nginx /api location");
checkSourceIncludes(apiLocation, "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;", "Nginx /api location");
checkSourceIncludes(apiLocation, "proxy_set_header X-Forwarded-Proto $scheme;", "Nginx /api location");
checkSourceIncludes(apiLocation, "proxy_set_header X-Forwarded-Host $host;", "Nginx /api location");

check(Boolean(uploadsLocation), "Nginx config must define location ^~ /uploads/.");
checkSourceIncludes(uploadsLocation, "alias /usr/share/nginx/uploads/;", "Nginx /uploads location");
checkSourceIncludes(uploadsLocation, "expires 30d;", "Nginx /uploads location");
checkSourceIncludes(uploadsLocation, 'Cache-Control "public, max-age=2592000"', "Nginx /uploads location");
checkSourceIncludes(uploadsLocation, "try_files $uri =404;", "Nginx /uploads location");

check(Boolean(staticLocation), "Nginx config must define static asset cache location.");
checkSourceIncludes(staticLocation, "expires 7d;", "Nginx static assets location");
checkSourceIncludes(staticLocation, 'Cache-Control "public, max-age=604800"', "Nginx static assets location");
checkSourceIncludes(staticLocation, "try_files $uri =404;", "Nginx static assets location");

check(Boolean(adminLocation), "Nginx config must define location ^~ /admin/.");
checkSourceIncludes(adminLocation, "alias /usr/share/nginx/admin/;", "Nginx /admin location");
checkSourceIncludes(adminLocation, 'Cache-Control "no-cache, no-store, must-revalidate"', "Nginx /admin location");
checkSourceIncludes(adminLocation, "try_files $uri $uri/ /admin/index.html;", "Nginx /admin location");

check(Boolean(h5Location), "Nginx config must define H5 SPA fallback location.");
checkSourceIncludes(h5Location, 'Cache-Control "no-cache, no-store, must-revalidate"', "Nginx H5 location");
checkSourceIncludes(h5Location, "try_files $uri $uri/ /index.html;", "Nginx H5 location");

checkSourceIncludes(compose, "./deploy/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro", "docker compose");
checkSourceIncludes(compose, "./apps/admin/dist:/usr/share/nginx/admin:ro", "docker compose");
checkSourceIncludes(compose, "./apps/mobile/dist/build/h5:/usr/share/nginx/h5:ro", "docker compose");
checkSourceIncludes(compose, "uploads-data:/usr/share/nginx/uploads:ro", "docker compose");

checkSourceIncludes(preflight, "function checkNginx", "preflight");
checkSourceIncludes(preflight, "server_tokens off", "preflight");
checkSourceIncludes(preflight, "X-Forwarded-For", "preflight");
checkSourceIncludes(preflight, "no-store", "preflight");
checkSourceIncludes(checklist, "Nginx", "launch checklist");
checkSourceIncludes(progress, "Nginx 静态 guard", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight nginx guard covers reverse proxy, cache, upload, and SPA rules.");
}
