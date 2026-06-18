import { API_BASE, SCENARIO, TENANT_CODE, api, auth, loginPlatformAdmin, pickList, reportStep } from "./online-showcase-lib.mjs";

async function main() {
  console.log(`线上演示商家 cleanup target: ${API_BASE}`);
  const platform = await loginPlatformAdmin();
  const tenants = pickList(await api("/admin/tenants", { headers: auth(platform.token) }));
  const tenant = tenants.find((item) => item.code === TENANT_CODE);
  if (!tenant) {
    reportStep("无需清理", `未找到 ${TENANT_CODE}`);
    return;
  }

  await api(`/admin/tenants/${tenant.id}`, {
    method: "PATCH",
    headers: auth(platform.token),
    body: JSON.stringify({
      code: tenant.code,
      name: tenant.name,
      region: tenant.region || "演示城市",
      contactName: tenant.contactName || "七维演示运营",
      contactPhone: tenant.contactPhone || "13990009999",
      enabled: false,
      settings: { ...(tenant.settings || {}), demoScenario: SCENARIO, disabledByCleanup: true },
      remark: `${tenant.remark || ""} cleanup:${new Date().toISOString()}`.slice(0, 500)
    })
  });

  const admins = pickList(await api(`/admin/admins?tenantId=${tenant.id}&includeSmoke=true&pageSize=100`, { headers: auth(platform.token) }));
  for (const admin of admins.filter((item) => String(item.username || "").startsWith("showcase_"))) {
    await api(`/admin/admins/${admin.id}`, {
      method: "PATCH",
      headers: auth(platform.token),
      body: JSON.stringify({ enabled: false })
    });
  }

  reportStep("演示商家已停用", `${TENANT_CODE}，数据保留便于审计；再次 seed 会重新启用`);
}

main().catch((error) => {
  console.error("\n线上演示商家 cleanup 失败：");
  console.error(error.message);
  process.exitCode = 1;
});
