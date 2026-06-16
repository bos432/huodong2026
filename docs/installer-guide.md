# Node 网页安装向导使用说明

本项目不是 PHP 架构，但根目录提供了一个兼容传统部署习惯的 `install.php` 入口。首次部署时访问 `/install.php`，它会检查 Node API 安装器状态，并进入 Node 内置 `/install` 网页安装向导；填写数据库、域名和管理员信息后，安装器会写入 `runtime/install.lock` 并关闭安装器。

## 适用环境

- 宝塔/传统服务器。
- 已安装 Node.js 22、npm、MySQL、Nginx。
- Node API 可作为常驻进程运行。
- 不适用于只支持 PHP 静态虚拟主机的空间。

## 首次安装步骤

1. 上传或拉取源码到服务器。

2. 安装依赖并构建。

```bash
npm run install:all
npm run build
```

3. 开启安装器。

在根目录 `.env` 或 `apps/api/.env` 中设置：

```env
INSTALLER_ENABLED=true
API_PORT=3000
```

如果还没有 env 文件，可以先复制生产模板：

```bash
cp deploy/.env.production.example .env
```

4. 启动 API。

```bash
npm --prefix apps/api run start
```

或：

```bash
node apps/api/dist/main.js
```

5. 配置 Nginx 反代。

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3000/api/;
}

location ^~ /uploads/ {
  alias /path/to/project/uploads/;
}

location ^~ /admin/ {
  alias /path/to/project/apps/admin/dist/;
  try_files $uri $uri/ /admin/index.html;
}

location / {
  root /path/to/project/apps/mobile/dist/build/h5;
  try_files $uri $uri/ /index.html;
}
```

6. 访问安装页。

```text
https://你的域名/install.php
```

如果 Nginx 将请求全部反代到 Node，也可以直接访问：

```text
https://你的域名/install
```

安装页会依次完成：

- 环境检查。
- 数据库连接检测。
- 写入 `.env` 和 `apps/api/.env`。
- 执行数据库迁移。
- 创建或更新超级管理员。
- 写入 `runtime/install.lock`。
- 将 `INSTALLER_ENABLED=false` 写回 env。

7. 安装完成后重启 API。

```bash
npm --prefix apps/api run start
```

使用进程管理工具时，在宝塔里重启 Node 项目即可。

8. 访问后台。

```text
https://你的域名/admin/
```

## 安全注意事项

- 安装完成后必须保留 `runtime/install.lock`。
- 安装完成后确认 `.env` 和 `apps/api/.env` 中 `INSTALLER_ENABLED=false`。
- 建议在 Nginx 或宝塔中禁止公网访问 `/install`。
- 不要删除安装锁；删除后若再次设置 `INSTALLER_ENABLED=true`，安装器会重新开放。
- 真实微信支付上线前仍需专项验收，不要只靠安装器打开真实支付。

## Docker 环境

Docker 部署时也可使用安装器，但通常建议直接编辑 `deploy/.env.production`。

如需临时开启：

```env
INSTALLER_ENABLED=true
```

然后重建 API：

```bash
docker compose --env-file deploy/.env.production -p activity-registration up -d --build api nginx
```

安装完成后把 `INSTALLER_ENABLED=false` 写回 env 并重启。
