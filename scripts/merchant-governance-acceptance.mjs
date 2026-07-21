const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const PASSWORD = process.env.ACCEPTANCE_PASSWORD || "Qiwai123456";
const TENANT_CODE = process.env.ACCEPTANCE_TENANT_CODE || "qiwai-showcase";
const ADMIN_USERNAME = process.env.ACCEPTANCE_ADMIN_USERNAME || "accept_110421_admin";
const CROSS_ADMIN_USERNAME = process.env.ACCEPTANCE_CROSS_ADMIN_USERNAME || "qiwai_hz_admin";
const stamp = Date.now();

function assert(value, message) { if (!value) throw new Error(message); }

async function raw(path, { method = "GET", token, tenantCode, body, form } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(tenantCode ? { "x-tenant-code": tenantCode } : {}),
      ...(form ? {} : { "content-type": "application/json" })
    },
    body: form || (body === undefined ? undefined : JSON.stringify(body))
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, data: payload?.data, message: payload?.message || text };
}

async function request(path, options = {}) {
  const result = await raw(path, options);
  if (result.status < 200 || result.status >= 300 || result.data === undefined) {
    throw new Error(`${options.method || "GET"} ${path} failed (${result.status}): ${result.message}`);
  }
  return result.data;
}

async function adminLogin(username) {
  return (await request("/admin/auth/login", { method: "POST", body: { username, password: PASSWORD } })).token;
}

function dateText(offsetDays) {
  const value = new Date(Date.now() + offsetDays * 86400000);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

async function runAcceptance() {
  const adminToken = await adminLogin(ADMIN_USERNAME);
  const crossTenantToken = await adminLogin(CROSS_ADMIN_USERNAME);
  const ownAdmin = await request("/admin/auth/me", { token: adminToken });
  const otherAdmin = await request("/admin/auth/me", { token: crossTenantToken });
  const tenantAdmins = await request("/admin/admins", { token: adminToken });
  const expiringStaff = tenantAdmins.find((item) => item.username === "showcase_ops");
  assert(ownAdmin?.id && otherAdmin?.id && expiringStaff?.id, "验收后台账号未找到");
  const phone = `131${String(stamp).slice(-8)}`;
  const login = await request("/public/auth/password-login", {
    method: "POST",
    tenantCode: TENANT_CODE,
    body: { phone, password: PASSWORD, nickname: `商户验收${String(stamp).slice(-6)}` }
  });
  const userToken = login.userAccessToken;

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), `license-${stamp}.png`);
  const uploaded = await request(`/public/me/mall/merchant-application-files?tenantCode=${TENANT_CODE}`, {
    method: "POST", token: userToken, tenantCode: TENANT_CODE, form
  });
  assert(uploaded.url && uploaded.size === png.length, "营业执照真实上传结果不正确");

  const suffix = String(stamp).slice(-12).toUpperCase();
  const creditCode = `9133${suffix.padStart(14, "0")}`.slice(0, 18);
  const applicationBody = {
    desiredName: `09.01验收店铺${String(stamp).slice(-6)}`,
    legalName: `09.01验收主体${String(stamp).slice(-6)}`,
    unifiedSocialCreditCode: creditCode,
    legalRepresentative: "验收法人",
    contactName: "验收联系人",
    contactPhone: phone,
    region: "浙江省杭州市",
    businessLicenseUrl: uploaded.url,
    qualificationFiles: [{ type: "business_scope", name: "经营范围附件", url: uploaded.url }],
    applyRemark: "09.01 商户入驻治理自动化验收，数据保留"
  };
  const application = await request(`/public/me/mall/merchant-applications?tenantCode=${TENANT_CODE}`, {
    method: "POST", token: userToken, tenantCode: TENANT_CODE, body: applicationBody
  });
  assert(application.status === "pending", "新申请不是待审核状态");

  const duplicatePending = await raw(`/public/me/mall/merchant-applications?tenantCode=${TENANT_CODE}`, {
    method: "POST", token: userToken, tenantCode: TENANT_CODE, body: applicationBody
  });
  assert(duplicatePending.status === 400, "同一用户重复待审核申请未拦截");
  const history = await request(`/public/me/mall/merchant-applications?tenantCode=${TENANT_CODE}`, { token: userToken, tenantCode: TENANT_CODE });
  assert(history.some((item) => item.id === application.id), "个人申请历史未回显");

  const crossList = await raw("/admin/mall/merchant-applications", { token: crossTenantToken });
  assert(crossList.status === 403 || (crossList.status === 200 && !crossList.data.some((item) => item.id === application.id)), "跨租户申请列表泄露");
  const crossReview = await raw(`/admin/mall/merchant-applications/${application.id}/review`, {
    method: "POST", token: crossTenantToken, body: { status: "approved", reviewRemark: "跨租户不应通过" }
  });
  assert([403, 404].includes(crossReview.status), "跨租户申请审核未拒绝");

  const reviewed = await request(`/admin/mall/merchant-applications/${application.id}/review`, {
    method: "POST", token: adminToken,
    body: { status: "approved", reviewRemark: "主体与材料核验通过", merchantCode: `accept_${String(stamp).slice(-10)}` }
  });
  const merchant = reviewed.merchant;
  assert(merchant?.id && merchant.status === "disabled" && merchant.mallEnabled === false, "审核通过后未创建待开通店铺");
  await request("/admin/mall/merchant-access", {
    method: "POST", token: adminToken,
    body: { adminId: ownAdmin.id, merchantId: merchant.id, accessRole: "owner", permissions: ["merchant.manage", "product.manage", "order.manage", "finance.view"], enabled: true }
  });

  const merchantPayload = {
    tenantId: merchant.tenant?.id || ownAdmin.tenant?.id,
    name: merchant.name,
    ownerType: merchant.ownerType,
    code: merchant.code,
    status: "active",
    mallEnabled: true,
    productAuditRequired: merchant.productAuditRequired,
    paymentMode: merchant.paymentMode,
    region: merchant.region || undefined,
    contactName: merchant.contactName || undefined,
    contactPhone: merchant.contactPhone || undefined
  };
  const prematureOpen = await raw(`/admin/mall/merchants/${merchant.id}`, { method: "PATCH", token: adminToken, body: merchantPayload });
  assert(prematureOpen.status === 400 && prematureOpen.message.includes("合同"), "无有效合同时店铺仍可开通或返回了错误门禁原因");

  const contract = await request("/admin/mall/merchant-contracts", {
    method: "POST", token: adminToken,
    body: {
      merchantId: merchant.id,
      contractNo: `HT-${stamp}`,
      version: 1,
      name: "09.01 商户合作合同",
      fileUrl: uploaded.url,
      startsAt: dateText(-1),
      endsAt: dateText(365),
      signedAt: new Date().toISOString(),
      platformCommissionBps: 325,
      serviceFeeBps: 75,
      settlementCycleDays: 14,
      remark: "09.01 自动化验收合同"
    }
  });
  const activated = await request(`/admin/mall/merchant-contracts/${contract.id}/activate`, { method: "POST", token: adminToken });
  assert(activated.contract.status === "active", "合同未成功启用");
  assert(activated.merchant.platformCommissionBps === 325 && activated.merchant.serviceFeeBps === 75 && activated.merchant.settlementCycleDays === 14, "合同费率或结算周期未同步");
  const opened = await request(`/admin/mall/merchants/${merchant.id}`, { method: "PATCH", token: adminToken, body: merchantPayload });
  assert(opened.status === "active" && opened.mallEnabled === true, "有效合同和资质齐备后未能开店");

  const crossAccess = await raw("/admin/mall/merchant-access", {
    method: "POST", token: adminToken,
    body: { adminId: otherAdmin.id, merchantId: merchant.id, accessRole: "clerk", permissions: ["order.view"], enabled: true }
  });
  assert(crossAccess.status === 400, "跨租户后台账号仍可获得店员授权");

  const expiredAccess = await request("/admin/mall/merchant-access", {
    method: "POST", token: adminToken,
    body: {
      adminId: expiringStaff.id,
      merchantId: merchant.id,
      accessRole: "manager",
      permissions: ["product.manage", "order.manage", "finance.view"],
      validFrom: new Date(Date.now() - 2 * 86400000).toISOString(),
      validUntil: new Date(Date.now() - 86400000).toISOString(),
      enabled: true
    }
  });
  assert(expiredAccess.enabled === true, "过期扫描夹具创建失败");
  const crossScan = await request("/admin/mall/merchant-governance/run", { method: "POST", token: crossTenantToken });
  assert(crossScan.tenantId && crossScan.expiredAccessCount === 0, "跨租户治理扫描处理了演示中心数据");
  const scan = await request("/admin/mall/merchant-governance/run", { method: "POST", token: adminToken });
  assert(scan.expiredAccessCount >= 1, "到期店员授权未被治理扫描停用");
  const accesses = await request(`/admin/mall/merchant-access?merchantId=${merchant.id}`, { token: adminToken });
  const scannedAccess = accesses.find((item) => item.id === expiredAccess.id);
  assert(scannedAccess?.enabled === false && scannedAccess.disabledReason === "店员授权已到期", "到期授权状态或原因不正确");

  const approvedDuplicateLogin = await request("/public/auth/password-login", {
    method: "POST", tenantCode: TENANT_CODE,
    body: { phone: `132${String(stamp).slice(-8)}`, password: PASSWORD, nickname: `重复主体${String(stamp).slice(-5)}` }
  });
  const approvedDuplicate = await raw(`/public/me/mall/merchant-applications?tenantCode=${TENANT_CODE}`, {
    method: "POST", token: approvedDuplicateLogin.userAccessToken, tenantCode: TENANT_CODE,
    body: { ...applicationBody, contactPhone: `132${String(stamp).slice(-8)}` }
  });
  assert(approvedDuplicate.status === 400, "已审核主体的信用代码重复申请未拦截");

  console.log(JSON.stringify({
    tenantCode: TENANT_CODE,
    member: { id: login.user.id, phone, password: PASSWORD },
    applicationId: application.id,
    merchantId: merchant.id,
    qualificationFileUrl: uploaded.url,
    contractId: contract.id,
    accessId: expiredAccess.id,
    governance: scan
  }, null, 2));
}

runAcceptance().catch((error) => { console.error(error); process.exitCode = 1; });
