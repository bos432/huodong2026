# 微信支付 + 后台充值余额支付上线方案

本方案用于本次首发范围：H5 和小程序用户登录后报名，支付方式只开放微信支付和后台充值余额支付；支付宝、多机构生产开关、公开线下收款入口不上线。

## 0. 是否可以直接上线

可以安排上线窗口和预发验收，但不能跳过最后准入。当前代码、构建、本地 Docker smoke 和 flow smoke 已通过；正式切生产前还必须完成：

- 替换 `deploy/.env.production` 的真实域名、`BUILD_COMMIT`、微信支付、短信配置。
- 备份生产数据库后执行 pending migrations。
- 微信支付预发专项验收通过，并生成新鲜的 `deploy/real-payment-smoke-result.json`。
- 禁用或修改默认 `admin / Admin123456`。
- `npm run preflight` 在生产配置和目标数据库环境下通过。

## 1. 上线资产

需要发布的源码目录：

- `apps/api`：NestJS API 后端。
- `apps/admin`：后台管理端。
- `apps/mobile`：H5/小程序端源码，Docker 中部署 H5 构建产物。
- `packages/shared`：前后端共享枚举和工具。
- `deploy`：生产 env 模板、Nginx 配置、smoke 结果文件。
- `docker-compose.yml`：MySQL、API、Nginx 编排。

新增关键数据库迁移：

- `apps/api/src/migrations/1780531000000-UserWalletsAndBalancePayment.ts`

它会新增：

- `user_wallets`
- `wallet_transactions`
- `orders.paymentMethod` 加入 `balance`

## 2. 生产配置必须修改的文件

### 2.1 `deploy/.env.production`

必须替换这些值：

```env
BUILD_COMMIT=<本次发布 git commit 或镜像 digest>
CORS_ORIGIN=https://<H5域名>,https://<后台域名>
PUBLIC_H5_ORIGIN=https://<H5域名>
PUBLIC_ADMIN_ORIGIN=https://<后台域名>/admin
PUBLIC_API_ORIGIN=https://<API域名或统一反代域名>
```

数据库：

```env
DB_HOST=<生产 MySQL 地址>
DB_PORT=3306
DB_USERNAME=<生产数据库用户>
DB_PASSWORD=<生产数据库密码>
DB_DATABASE=<生产数据库名>
DB_SYNCHRONIZE=false
```

本次首发开关：

```env
REAL_PAYMENT_ENABLED=false
ALIPAY_ENABLED=false
MULTI_TENANT_ENABLED=false
H5_AUTH_MODE=sms
WECHAT_LOGIN_REAL_ENABLED=true
```

微信支付预发验收通过后，再打开：

```env
REAL_PAYMENT_ENABLED=true
WECHAT_PAY_ENABLED=true
REAL_PAYMENT_PREFLIGHT_PASSED=true
```

微信支付配置：

```env
WECHAT_PAY_APP_ID=<公众号/小程序 appid>
WECHAT_PAY_MCH_ID=<微信支付商户号>
WECHAT_PAY_API_V3_KEY=<API v3 key>
WECHAT_PAY_PRIVATE_KEY_PATH=<容器内私钥路径>
WECHAT_PAY_CERT_SERIAL_NO=<商户证书序列号>
WECHAT_PAY_PLATFORM_CERT_PATH=<容器内平台证书路径>
WECHAT_PAY_NOTIFY_URL=https://<API域名>/api/payment/wechat/callback
WECHAT_APP_ID=<小程序 appid>
WECHAT_APP_SECRET=<小程序 secret>
```

短信配置：

```env
SMS_PROVIDER_ENABLED=true
SMS_PROVIDER=tencent-cloud-sms
SMS_ACCESS_KEY_ID=<短信 access key>
SMS_ACCESS_KEY_SECRET=<短信 secret>
SMS_SIGN_NAME=<短信签名>
SMS_TEMPLATE_ID=<验证码模板 ID>
```

保持关闭：

```env
ALIPAY_ENABLED=false
MULTI_TENANT_ENABLED=false
```

### 2.2 `docker-compose.yml`

通常不需要改。确认这些挂载保留：

```yaml
volumes:
  - uploads-data:/app/uploads
  - uploads-data:/usr/share/nginx/uploads:ro
```

### 2.3 `deploy/nginx/default.conf`

通常不需要改。必须保留：

```nginx
location ^~ /uploads/ {
  alias /usr/share/nginx/uploads/;
}
```

`^~` 不能去掉，否则 `/uploads/*.png` 会被静态资源正则抢走，导致上传图片 404。

### 2.4 `apps/api/.env`

注意：本地/源码迁移命令会优先读取 `apps/api/.env`，再读取根目录 `.env`。生产执行迁移前必须保证它不会覆盖生产数据库配置。

推荐二选一：

- 生产服务器上把 `apps/api/.env` 改成生产数据库配置。
- 或临时移走 `apps/api/.env`，并把 `deploy/.env.production` 复制为根目录 `.env` 后再跑迁移。

## 3. 服务器准备

服务器需要：

- Docker 和 Docker Compose v2。
- Node.js 22 和 npm，用于构建、preflight、migration、smoke。
- MySQL 8.4，或使用 `docker-compose.yml` 内置 MySQL。
- 可访问微信支付回调域名，HTTPS 证书已配置在外层网关或 Nginx 前置代理。

生产目录建议：

```bash
/opt/activity-registration
```

## 4. 发布步骤

### 4.0 可选：使用网页安装向导

宝塔/传统服务器可先开启 Node 网页安装向导，访问 `https://域名/install` 完成数据库、域名和管理员初始化。安装器说明见 `docs/installer-guide.md`。

安装器只负责首次基础安装；真实微信支付、短信、生产 preflight 和支付专项验收仍需按本文后续步骤完成。

### 4.1 拉取源码

```bash
cd /opt
git clone <repo-url> activity-registration
cd /opt/activity-registration
git checkout <release-tag-or-commit>
```

如果是已有目录：

```bash
cd /opt/activity-registration
git fetch --all --tags
git checkout <release-tag-or-commit>
```

### 4.2 安装依赖

```bash
npm run install:all
```

### 4.3 准备生产 env

推荐：

```bash
cp deploy/.env.production .env
```

然后编辑 `.env`，填入真实生产值。也可以不复制，后续所有 compose 命令都带：

```bash
--env-file deploy/.env.production
```

### 4.4 构建

```bash
npm run test
npm run build
```

### 4.5 备份数据库

如果使用项目脚本：

```bash
npm run db:backup
```

如果生产库不在当前 Docker Compose 内，务必用生产 MySQL 参数做一次独立备份，例如：

```bash
mysqldump -h <db-host> -P 3306 -u <db-user> -p --single-transaction --routines --triggers <db-name> > backup-before-go-live.sql
```

### 4.6 查看并执行迁移

先确认迁移连接的是生产库，不是本地开发库。

```bash
npm --prefix apps/api run migration:show
npm --prefix apps/api run migration:run
```

本次必须包含钱包迁移：

```text
1780531000000-UserWalletsAndBalancePayment
```

执行后再看一次：

```bash
npm --prefix apps/api run migration:show
```

### 4.7 启动服务

使用 `deploy/.env.production`：

```bash
docker compose --env-file deploy/.env.production -p activity-registration up -d --build mysql api nginx
```

如果已经复制为根目录 `.env`：

```bash
docker compose -p activity-registration up -d --build mysql api nginx
```

查看状态：

```bash
docker compose -p activity-registration ps
docker compose -p activity-registration logs -f api
```

健康检查：

```bash
curl https://<API域名>/api/health/live
curl https://<API域名>/api/health/ready
```

## 5. 上线验收命令

生产配置检查：

```bash
npm run preflight
```

接口 smoke：

```bash
API_BASE=https://<API域名>/api npm run smoke
```

完整业务流 smoke：

```bash
API_BASE=https://<API域名>/api npm run smoke:flow
```

微信支付专项预发：

```bash
API_BASE=https://<API域名>/api npm run smoke:real-payment
```

专项通过后确认结果文件：

```bash
deploy/real-payment-smoke-result.json
```

## 6. 首发人工验收流程

### 6.1 H5

1. 打开 H5 域名。
2. 手机号验证码登录。
3. 选择活动报名。
4. 选择微信支付。
5. 完成支付。
6. 微信回调后进入“我的报名”，确认订单已支付、报名状态正确。

### 6.2 小程序

1. 小程序微信登录。
2. 报名活动。
3. 选择微信支付 JSAPI。
4. 完成支付。
5. 回到报名详情，确认订单和报名状态。

### 6.3 余额支付

1. 后台进入会员/用户详情。
2. 给用户充值余额。
3. 用户报名选择余额支付。
4. 确认余额扣减、订单 paid、报名进入 pending_review 或 approved。
5. 后台财务查看余额流水和订单流水一致。

### 6.4 权限

1. 非财务角色不能确认历史线下收款。
2. 财务角色可以查看订单、支付流水、余额流水。
3. 操作日志能看到余额充值、退款、签到、候补等高风险动作。

## 7. 切流量前最终开关

确认：

```env
REAL_PAYMENT_ENABLED=true
WECHAT_PAY_ENABLED=true
ALIPAY_ENABLED=false
MULTI_TENANT_ENABLED=false
PAYMENT_SANDBOX_ENABLED=false
H5_AUTH_MODE=sms
DB_SYNCHRONIZE=false
```

如果微信支付预发还没通过：

```env
REAL_PAYMENT_ENABLED=false
WECHAT_PAY_ENABLED=false
```

此时只能做后台充值余额支付验收，不能开放真实微信支付生产流量。

## 8. 默认管理员处理

上线前必须处理默认账号：

- 修改 `admin / Admin123456` 密码，或禁用默认账号。
- 确认 smoke/admin 测试账号已禁用。

可运行：

```bash
npm run admins:disable-smoke
```

然后登录后台确认管理员列表和登录日志。

## 9. 回滚方案

### 9.1 代码回滚

```bash
git checkout <previous-release-tag-or-commit>
docker compose --env-file deploy/.env.production -p activity-registration up -d --build api nginx
```

### 9.2 数据库回滚

优先使用上线前备份恢复：

```bash
mysql -h <db-host> -P 3306 -u <db-user> -p <db-name> < backup-before-go-live.sql
```

如果只需要回滚最后一次迁移，且确认没有生产新数据依赖，可用：

```bash
npm --prefix apps/api run migration:revert
```

钱包相关迁移涉及订单支付方式枚举和余额流水，生产有交易后不建议随意 revert，应优先走备份恢复或人工补偿方案。

## 10. 上线 Go / No-Go

Go 条件：

- `npm run test` 通过。
- `npm run build` 通过。
- `npm run preflight` 通过。
- `API_BASE=https://<API域名>/api npm run smoke` 通过。
- `API_BASE=https://<API域名>/api npm run smoke:flow` 通过。
- 微信支付专项预发通过，`deploy/real-payment-smoke-result.json` 新鲜有效。
- 生产短信验证码可用。
- 默认管理员已处理。
- 数据库已备份，迁移已执行。

No-Go 条件：

- `deploy/.env.production` 仍有 `example.com` 或 `replace-with`。
- 微信支付证书、API v3 key、回调地址未配置。
- `REAL_PAYMENT_ENABLED=true` 但微信支付专项未通过。
- `DB_SYNCHRONIZE=true`。
- 默认 `admin / Admin123456` 仍可登录。
- 任一 smoke 或 preflight 失败。
