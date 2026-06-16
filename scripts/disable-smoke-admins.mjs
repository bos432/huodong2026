const baseUrl = process.env.API_BASE_URL || "http://localhost:3000/api";
const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD || "Admin123456";

async function api(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok || body?.code !== 0) throw new Error(`${options.method || "GET"} ${path} failed: ${body?.message || text || res.status}`);
  return body.data;
}

const login = await api("/admin/auth/login", {
  method: "POST",
  body: JSON.stringify({ username, password })
});

const auth = { Authorization: `Bearer ${login.token}` };
let page = 1;
let disabled = 0;

while (true) {
  const result = await api(`/admin/admins?page=${page}&pageSize=100&includeSmoke=true&keyword=smoke_`, { headers: auth });
  const items = result.items || [];
  for (const admin of items) {
    if (admin.username.startsWith("smoke_") && admin.enabled) {
      await api(`/admin/admins/${admin.id}/status`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ enabled: false })
      });
      disabled += 1;
    }
  }
  if (page * result.pageSize >= result.total) break;
  page += 1;
}

console.log(`Disabled ${disabled} smoke admin account(s).`);
