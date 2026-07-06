# 本地部署文档

生成时间：2026-07-06 08:55 +08:00

## 1. 推荐环境

| 项 | 推荐 |
| --- | --- |
| Node.js | 22 LTS 或 24，本次小程序构建使用 `v24.14.0` 通过 |
| npm | 项目随 Node 安装即可 |
| 数据库 | MariaDB/MySQL，当前本机 MariaDB 12.3 |
| 端口 | API `3000`，H5 `5173`，Admin `5174`，DB `13306` |

本机可用 Node 24：

```powershell
$env:PATH='C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
node -v
```

## 2. 工作目录

所有代码改动均在工作副本：

```text
E:\2027\AI全自动开发1.0\活动报名-重编排工作副本
```

原项目目录：

```text
E:\2027\活动报名\活动报名
```

除早前已生成的一份方案文档外，业务代码改动不在原项目中进行。

## 3. 数据库

当前本地使用原项目已有 MariaDB 数据目录：

```powershell
& 'C:\Program Files\MariaDB 12.3\bin\mariadbd.exe' `
  --datadir='E:\2027\活动报名\活动报名\.local-mariadb\data' `
  --port=13306 `
  --bind-address=127.0.0.1 `
  --tmpdir='E:\2027\活动报名\活动报名\.local-mariadb\tmp' `
  --log-error='E:\2027\活动报名\活动报名\.local-mariadb\mariadb-13306.err.log' `
  --pid-file=activity-mariadb-13306.pid `
  --character-set-server=utf8mb4 `
  --collation-server=utf8mb4_unicode_ci
```

API 环境文件：

```text
apps/api/.env
```

关键本地配置：

```text
DB_HOST=127.0.0.1
DB_PORT=13306
DB_USERNAME=activity
DB_DATABASE=activity_registration
DB_SYNCHRONIZE=false
H5_AUTH_MODE=dev
PAYMENT_SANDBOX_ENABLED=true
```

## 4. 启动服务

进入工作副本：

```powershell
cd 'E:\2027\AI全自动开发1.0\活动报名-重编排工作副本'
```

启动 API：

```powershell
npm --prefix apps/api run build
npm --prefix apps/api run start
```

启动后台开发服务，代理必须指向本地 API：

```powershell
$env:VITE_DEV_API_PROXY='http://127.0.0.1:3000'
npm --prefix apps/admin run dev
```

启动 H5 开发服务：

```powershell
$env:VITE_DEV_API_PROXY='http://127.0.0.1:3000'
$env:VITE_DEFAULT_TENANT_CODE='qiwai-showcase'
npm --prefix apps/mobile run dev:h5
```

访问地址：

```text
API ready: http://127.0.0.1:3000/api/health/ready
PC 后台:   http://127.0.0.1:5174/admin/login
H5:        http://127.0.0.1:5173/?tenantCode=qiwai-showcase#/
```

## 5. 初始化演示数据

```powershell
$env:API_BASE='http://127.0.0.1:3000/api'
$env:SHOWCASE_ADMIN_USERNAME='admin'
$env:SHOWCASE_ADMIN_PASSWORD='Admin123456'
$env:SHOWCASE_PASSWORD='Qiwai123456'
npm run seed:online-showcase
```

该命令会创建/更新：

- `qiwai-showcase` 演示商家；
- 平台/商家/运营/财务/签到/商城/代理账号；
- 活动、票种、首页装修、营销弹窗、广告计划、专题内容、商城商品和演示会员。

## 6. 验收命令

接口闭环：

```powershell
$env:API_BASE='http://127.0.0.1:3000/api'
$env:SHOWCASE_ADMIN_USERNAME='admin'
$env:SHOWCASE_ADMIN_PASSWORD='Admin123456'
$env:SHOWCASE_PASSWORD='Qiwai123456'
npm run smoke:online-showcase
```

PC 后台 + H5 页面级验收：

```powershell
$env:WEB_BASE='http://127.0.0.1:5173'
$env:ADMIN_WEB_BASE='http://127.0.0.1:5174'
$env:API_BASE='http://127.0.0.1:3000/api'
$env:TENANT_CODE='qiwai-showcase'
$env:PLATFORM_ADMIN_USERNAME='admin'
$env:PLATFORM_ADMIN_PASSWORD='Admin123456'
$env:SHOWCASE_PASSWORD='Qiwai123456'
npm run browser:online-showcase
```

手机管理端页面级验收：

```powershell
$env:WEB_BASE='http://127.0.0.1:5173'
$env:TENANT_CODE='qiwai-showcase'
$env:SHOWCASE_PASSWORD='Qiwai123456'
$env:MOBILE_ADMIN_USERNAME='showcase_ops'
$env:MOBILE_ADMIN_PASSWORD='Qiwai123456'
npm run browser:mobile-admin
```

## 7. 构建命令

建议先切到 Node 22/24：

```powershell
$env:PATH='C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
node -v
```

构建：

```powershell
npm --prefix packages/shared run build
npm --prefix apps/api run test
npm --prefix apps/api run build
npm --prefix apps/admin run build
npm --prefix apps/mobile run build:h5
npm --prefix apps/mobile run build:mp-weixin
```

小程序构建产物：

```text
apps/mobile/dist/build/mp-weixin
```

微信开发者工具导入该目录，上传体验版并提交审核。

## 8. 停止服务

按当前本地进程停止：

```powershell
Stop-Process -Id 15292,63972,59420 -Force
```

MariaDB 如仍需保留本地演示环境，不建议停止；若必须停止：

```powershell
Stop-Process -Id 54264 -Force
```

## 9. 生产部署提醒

- 生产环境必须替换默认 `admin / Admin123456`。
- `H5_AUTH_MODE` 必须从 `dev` 切换到 `sms`，并配置真实短信服务。
- 真实微信/支付宝支付、退款、账单、回调和证书必须完成预发验证，不能用沙箱结果替代。
- 配置正式域名、HTTPS、CORS、HSTS、JWT 密钥、数据库强密码、备份和监控。
- 本次涉及 `apps/mobile`，上线小程序必须重新上传体验版并提交审核。
