export const installPageHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>系统安装向导</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; background: #f5f7fb; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    main { width: min(960px, 100%); background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 24px 80px rgba(15, 23, 42, .08); overflow: hidden; }
    header { padding: 24px 28px; border-bottom: 1px solid #e5e7eb; background: #0f766e; color: #fff; }
    h1 { margin: 0; font-size: 24px; line-height: 1.25; }
    .sub { margin-top: 8px; color: rgba(255,255,255,.82); font-size: 14px; }
    .wrap { display: grid; grid-template-columns: 220px 1fr; min-height: 560px; }
    nav { padding: 22px; border-right: 1px solid #e5e7eb; background: #f8fafc; }
    nav div { padding: 10px 12px; border-radius: 6px; color: #64748b; font-weight: 700; font-size: 14px; }
    nav div.active { background: #e6f2ef; color: #0f766e; }
    section { padding: 24px 28px 28px; }
    h2 { margin: 0 0 16px; font-size: 20px; }
    label { display: grid; gap: 6px; margin: 12px 0; color: #344054; font-size: 14px; font-weight: 700; }
    input { height: 40px; border: 1px solid #d0d5dd; border-radius: 6px; padding: 0 12px; font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
    .actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 22px; }
    button { border: 0; border-radius: 6px; height: 40px; padding: 0 16px; font-weight: 800; cursor: pointer; }
    button.primary { background: #0f766e; color: #fff; }
    button.secondary { background: #eef2f7; color: #344054; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    pre { white-space: pre-wrap; word-break: break-word; background: #0f172a; color: #e2e8f0; padding: 14px; border-radius: 6px; min-height: 120px; font-size: 12px; line-height: 1.6; }
    .notice { padding: 12px 14px; border-radius: 6px; background: #fff7ed; color: #9a3412; line-height: 1.6; margin: 12px 0; }
    .ok { background: #ecfdf5; color: #047857; }
    .danger { background: #fef2f2; color: #b91c1c; }
    .muted { color: #667085; font-size: 13px; line-height: 1.6; }
    @media (max-width: 760px) { .wrap { grid-template-columns: 1fr; } nav { display: flex; overflow: auto; border-right: 0; border-bottom: 1px solid #e5e7eb; } nav div { white-space: nowrap; } .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
<main>
  <header><h1>系统安装向导</h1><div class="sub">填写数据库、域名和管理员信息，完成后系统会写入安装锁。</div></header>
  <div class="wrap">
    <nav id="steps"></nav>
    <section>
      <h2 id="title"></h2>
      <div id="content"></div>
      <div class="actions">
        <button class="secondary" id="prev">上一步</button>
        <button class="primary" id="next">下一步</button>
      </div>
    </section>
  </div>
</main>
<script>
const stepNames = ["环境检查", "数据库配置", "站点域名", "管理员账号", "可选配置", "执行安装", "完成"];
const state = {
  step: 0,
  token: "",
  db: { host: "127.0.0.1", port: 3306, database: "", username: "", password: "" },
  site: { h5Origin: location.origin, adminOrigin: location.origin + "/admin", apiOrigin: location.origin },
  admin: { username: "admin", password: "" },
  optional: {},
  log: ""
};
const el = (id) => document.getElementById(id);
function api(path, options = {}) {
  return fetch("/api/install" + path, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", "x-installer-token": state.token, ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  }).then(async (res) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.code !== 0) throw new Error(body.message || res.statusText);
    return body.data;
  });
}
function field(group, key, label, type = "text") {
  const value = state[group][key] || "";
  return '<label>' + label + '<input type="' + type + '" value="' + String(value).replaceAll('"','&quot;') + '" data-group="' + group + '" data-key="' + key + '"></label>';
}
function collect() {
  document.querySelectorAll("input[data-group]").forEach((input) => {
    const group = input.dataset.group;
    const key = input.dataset.key;
    state[group][key] = key === "port" ? Number(input.value) : input.value.trim();
  });
}
function renderSteps() {
  el("steps").innerHTML = stepNames.map((name, i) => '<div class="' + (i === state.step ? 'active' : '') + '">' + (i + 1) + ". " + name + '</div>').join("");
}
function render() {
  renderSteps();
  el("prev").disabled = state.step === 0;
  el("next").textContent = state.step === 5 ? "开始安装" : state.step === 6 ? "进入后台" : "下一步";
  el("title").textContent = stepNames[state.step];
  if (state.step === 0) el("content").innerHTML = '<div id="status" class="notice">正在检查安装状态...</div><pre id="statusLog"></pre>';
  if (state.step === 1) el("content").innerHTML = '<div class="grid">' + field("db","host","数据库地址") + field("db","port","端口","number") + field("db","database","数据库名") + field("db","username","数据库用户") + field("db","password","数据库密码","password") + '</div><div class="notice">请确认该账号拥有建表和修改表结构权限。</div>';
  if (state.step === 2) el("content").innerHTML = '<div class="grid">' + field("site","h5Origin","H5 域名") + field("site","adminOrigin","后台域名") + field("site","apiOrigin","API 公开域名") + '</div>';
  if (state.step === 3) el("content").innerHTML = '<div class="grid">' + field("admin","username","超级管理员账号") + field("admin","password","超级管理员密码","password") + '</div><div class="notice">密码至少 8 位。安装完成后请妥善保存。</div>';
  if (state.step === 4) el("content").innerHTML = '<div class="muted">短信和微信支付可以跳过，安装后在后台或 env 中继续配置。真实微信支付上线前仍需专项验收。</div><div class="grid">' + field("optional","smsAccessKeyId","短信 AccessKeyId") + field("optional","smsAccessKeySecret","短信 Secret","password") + field("optional","smsSignName","短信签名") + field("optional","smsTemplateId","短信模板 ID") + field("optional","wechatAppId","微信 AppId") + field("optional","wechatAppSecret","微信 AppSecret","password") + field("optional","wechatPayMchId","微信商户号") + field("optional","wechatPayApiV3Key","微信 API v3 Key","password") + '</div>';
  if (state.step === 5) el("content").innerHTML = '<div class="notice">将写入 .env 和 apps/api/.env，执行数据库迁移，创建管理员并写入安装锁。</div><pre id="runLog">' + state.log + '</pre>';
  if (state.step === 6) el("content").innerHTML = '<div class="notice ok">安装完成。请将 INSTALLER_ENABLED=false 并重启 API，然后进入后台。</div><div class="muted">如果使用宝塔，请确认 /install 已禁止公网访问或安装器已关闭。</div>';
}
async function init() {
  render();
  try {
    const status = await api("/status");
    state.token = status.installerSessionToken || "";
    const cls = status.installed ? "notice ok" : status.enabled ? "notice ok" : "notice danger";
    el("status").className = cls;
    el("status").textContent = status.installed ? "系统已安装，安装向导已锁定。" : status.enabled ? "安装器已启用，可以继续。" : "安装器未启用，请设置 INSTALLER_ENABLED=true 后重启 API。";
    el("statusLog").textContent = JSON.stringify(status, null, 2);
    if (status.installed || !status.enabled) el("next").disabled = true;
  } catch (e) {
    el("status").className = "notice danger";
    el("status").textContent = e.message;
  }
}
async function next() {
  collect();
  try {
    if (state.step === 1) await api("/check-db", { method: "POST", body: state.db });
    if (state.step === 5) {
      el("next").disabled = true;
      const payload = { ...state.db, ...state.site, ...state.optional };
      const lines = [];
      const add = (text) => { lines.push(text); state.log = lines.join("\\n"); render(); };
      add("1/4 写入配置...");
      await api("/write-config", { method: "POST", body: payload });
      add("2/4 执行数据库迁移...");
      await api("/run-migrations", { method: "POST", body: {} });
      add("3/4 创建超级管理员...");
      await api("/create-admin", { method: "POST", body: state.admin });
      add("4/4 写入安装锁...");
      await api("/finalize", { method: "POST", body: {} });
      add("安装完成。");
      state.step = 6;
      render();
      return;
    }
    if (state.step === 6) {
      location.href = "/admin/";
      return;
    }
    state.step += 1;
    render();
  } catch (e) {
    alert(e.message);
    el("next").disabled = false;
  }
}
el("prev").onclick = () => { collect(); state.step = Math.max(0, state.step - 1); render(); if (state.step === 0) init(); };
el("next").onclick = next;
init();
</script>
</body>
</html>`;

export const installedPageHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>系统已安装</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; background: #f5f7fb; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    main { width: min(640px, 100%); background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 24px 80px rgba(15, 23, 42, .08); padding: 28px; }
    h1 { margin: 0 0 12px; font-size: 24px; line-height: 1.25; }
    p { margin: 0 0 12px; color: #475467; line-height: 1.7; }
    a { display: inline-flex; align-items: center; height: 40px; padding: 0 16px; border-radius: 6px; background: #0f766e; color: #fff; text-decoration: none; font-weight: 800; }
    .notice { padding: 12px 14px; border-radius: 6px; background: #ecfdf5; color: #047857; line-height: 1.6; margin: 16px 0; }
  </style>
</head>
<body>
  <main>
    <h1>系统已安装</h1>
    <p>检测到安装锁文件，安装向导已锁定，不再允许重复写入配置或重新初始化数据库。</p>
    <div class="notice">请确认生产环境中 <strong>INSTALLER_ENABLED=false</strong>，并在 Nginx/宝塔中限制公网访问 /install。</div>
    <a href="/admin/">进入后台</a>
  </main>
</body>
</html>`;
