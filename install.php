<?php
$lockFile = __DIR__ . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'install.lock';
$installed = is_file($lockFile);
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$baseUrl = $scheme . '://' . $host;
$installUrl = $baseUrl . '/install';
$adminUrl = $baseUrl . '/admin/';
$apiStatusUrl = $baseUrl . '/api/install/status';
?>
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>系统安装入口</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; background: #f5f7fb; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    main { width: min(680px, 100%); background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 24px 80px rgba(15, 23, 42, .08); padding: 28px; }
    h1 { margin: 0 0 12px; font-size: 24px; line-height: 1.25; }
    p { margin: 0 0 12px; color: #475467; line-height: 1.7; }
    a, button { display: inline-flex; align-items: center; height: 40px; padding: 0 16px; border: 0; border-radius: 6px; background: #0f766e; color: #fff; text-decoration: none; font-weight: 800; cursor: pointer; }
    .notice { padding: 12px 14px; border-radius: 6px; background: #fff7ed; color: #9a3412; line-height: 1.6; margin: 16px 0; }
    .ok { background: #ecfdf5; color: #047857; }
    .danger { background: #fef2f2; color: #b91c1c; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  </style>
</head>
<body>
  <main>
    <?php if ($installed): ?>
      <h1>系统已安装</h1>
      <p>检测到 <code>runtime/install.lock</code>，安装入口已锁定。</p>
      <div class="notice ok">请确认生产环境中 <code>INSTALLER_ENABLED=false</code>，并在宝塔/Nginx 中限制公网访问安装入口。</div>
      <a href="<?php echo htmlspecialchars($adminUrl, ENT_QUOTES); ?>">进入后台</a>
    <?php else: ?>
      <h1>系统安装入口</h1>
      <p>这是兼容传统 <code>install.php</code> 习惯的入口。实际安装由 Node API 的 <code>/install</code> 向导完成。</p>
      <div id="status" class="notice">正在检查 Node 安装器是否可用...</div>
      <a id="installLink" href="<?php echo htmlspecialchars($installUrl, ENT_QUOTES); ?>">进入安装向导</a>
      <script>
        const statusEl = document.getElementById("status");
        fetch("<?php echo htmlspecialchars($apiStatusUrl, ENT_QUOTES); ?>", { credentials: "same-origin" })
          .then(async (res) => {
            const body = await res.json().catch(() => ({}));
            if (!res.ok || body.code !== 0) throw new Error("Node API 未就绪");
            const data = body.data || {};
            if (data.installed) {
              statusEl.className = "notice ok";
              statusEl.textContent = "系统已安装，安装入口已锁定。";
              document.getElementById("installLink").href = "<?php echo htmlspecialchars($adminUrl, ENT_QUOTES); ?>";
              document.getElementById("installLink").textContent = "进入后台";
              return;
            }
            if (!data.enabled) {
              statusEl.className = "notice danger";
              statusEl.textContent = "Node API 已启动，但安装器未开启。请在 .env 或 apps/api/.env 设置 INSTALLER_ENABLED=true 后重启 API。";
              return;
            }
            statusEl.className = "notice ok";
            statusEl.textContent = "Node 安装器已就绪，即将进入安装向导。";
            window.location.href = "<?php echo htmlspecialchars($installUrl, ENT_QUOTES); ?>";
          })
          .catch(() => {
            statusEl.className = "notice danger";
            statusEl.innerHTML = "Node API 暂不可用。请先在宝塔 Node 项目中启动 API，启动命令通常是 <code>npm --prefix apps/api run start</code> 或 <code>node apps/api/dist/main.js</code>。";
          });
      </script>
    <?php endif; ?>
  </main>
</body>
</html>
