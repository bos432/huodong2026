import { API_BASE, api, auth, env, loginAdmin, reportStep } from "./online-showcase-lib.mjs";

const password = env("SHOWCASE_PASSWORD");

const cases = [
  { username: "showcase_store_owner", allow: ["/admin/mall/accessible-merchants", "/admin/mall/products?pageSize=1&merchantId={merchantId}", "/admin/mall/orders?pageSize=1&merchantId={merchantId}"], deny: ["/admin/agent-settlements"] },
  { username: "showcase_store_finance", allow: ["/admin/mall/accessible-merchants", "/admin/mall/orders?pageSize=1&merchantId={merchantId}", "/admin/mall/settlements?pageSize=1&merchantId={merchantId}"], deny: ["/admin/mall/products?pageSize=1&merchantId={merchantId}"] },
  { username: "showcase_agent_owner", allow: ["/admin/agent-settlements", "/admin/orders?pageSize=1", "/admin/mall/orders?pageSize=1&merchantId={merchantId}"], deny: ["/admin/mall/products?pageSize=1&merchantId={merchantId}"] }
];

async function pickMerchantId(token, username) {
  const merchants = await api("/admin/mall/accessible-merchants", { headers: auth(token) });
  const preferred = merchants.find((item) => item.code === "qiwai-showcase-main")
    || merchants.find((item) => item.code === "qiwai-showcase-self")
    || merchants.find((item) => item.mallEnabled !== false && item.status === "active")
    || merchants[0];
  if (!preferred?.id) throw new Error(`${username} 没有可用于验收的授权店铺`);
  reportStep(`${username} 验收店铺`, `${preferred.name || preferred.code}#${preferred.id}`);
  return preferred.id;
}

function scopedPath(path, merchantId) {
  return path.replaceAll("{merchantId}", String(merchantId));
}

async function expectOk(token, path, username) {
  await api(path, { headers: auth(token) });
  reportStep(`${username} 可访问`, path);
}

async function expectForbidden(token, path, username) {
  try {
    await api(path, { headers: auth(token) });
  } catch (error) {
    if (String(error.message || "").includes("无权限") || String(error.message || "").includes("403")) {
      reportStep(`${username} 已拒绝`, path);
      return;
    }
    throw error;
  }
  throw new Error(`${username} 不应访问 ${path}`);
}

async function main() {
  console.log(`角色验收目标：${API_BASE}`);
  for (const item of cases) {
    const login = await loginAdmin(item.username, password);
    reportStep(`${item.username} 登录成功`);
    const merchantId = await pickMerchantId(login.token, item.username);
    for (const path of item.allow) await expectOk(login.token, scopedPath(path, merchantId), item.username);
    for (const path of item.deny) await expectForbidden(login.token, scopedPath(path, merchantId), item.username);
  }
  console.log("OK 店铺/代理演示账号角色验收通过");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
