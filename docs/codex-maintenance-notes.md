# Codex 维护笔记

每次开始修复、提交、推送、部署前，先阅读本文件。这里记录本项目已经踩过的坑和固定处理方式，避免反复排查同一个问题。

## 提交前检查

- 先执行 `git status -sb`，确认只提交本次任务相关文件。
- 不要碰未跟踪的本地运行/交付文件，例如 `.local-mariadb/`、`交付包-20260702.zip`、`交付包-20260702/`、`交付包-20260704/`。
- 代码变更后按影响范围跑测试和构建：

```powershell
npm --prefix apps/api run test -- notification-provider
npm --prefix apps/api run test -- config-validation
npm --prefix apps/api run build
npm --prefix apps/admin run build
```

- 如果改了小程序端 `apps/mobile`，还要跑：

```powershell
npm --prefix apps/mobile run build:mp-weixin
npm --prefix apps/mobile run build:h5
```

## GitHub 推送

本机 Git 全局配置曾设置代理：

```text
http.proxy=http://127.0.0.1:7897
https.proxy=http://127.0.0.1:7897
```

这个代理会导致 GitHub HTTPS 推送报错：

```text
schannel: failed to receive handshake, SSL/TLS connection failed
```

推送时优先使用临时清空代理的命令：

```powershell
git -C "E:\2027\活动报名\活动报名" -c http.proxy= -c https.proxy= -c http.version=HTTP/1.1 push origin feature/qiwai-ui-experiment
```

如果要永久取消代理：

```powershell
git config --global --unset http.proxy
git config --global --unset https.proxy
```

确认推送状态：

```powershell
git -C "E:\2027\活动报名\活动报名" status -sb
git -C "E:\2027\活动报名\活动报名" ls-remote origin refs/heads/feature/qiwai-ui-experiment
```

## 服务器部署

宝塔终端部署前先确认最新提交已推送到 GitHub。服务器使用以下流程：

```bash
cd /www/wwwroot/rd.chaimen666.com
set -e

PM2=/www/server/nodejs/v22.22.3/lib/node_modules/pm2/bin/pm2

git fetch origin
git pull --ff-only origin feature/qiwai-ui-experiment

COMMIT=$(git rev-parse --short HEAD)
NOW=$(date -Iseconds)
sed -i "s|^BUILD_COMMIT=.*|BUILD_COMMIT=$COMMIT|" .env apps/api/.env
sed -i "s|^BUILD_TIME=.*|BUILD_TIME=$NOW|" .env apps/api/.env

npm --prefix apps/api run build
npm --prefix apps/admin run build

export BUILD_COMMIT="$COMMIT"
export BUILD_TIME="$NOW"
$PM2 restart activity-api --update-env
$PM2 save

/www/server/nginx/sbin/nginx -t
/www/server/nginx/sbin/nginx -s reload

curl -i --max-time 10 https://rd.chaimen666.com/api/health/ready
curl -i --max-time 10 https://rd.chaimen666.com/admin/version.json
```

如果只改了后台或 API，不需要重新提交小程序审核。只要改了 `apps/mobile` 或小程序构建产物，就需要重新上传体验版并提交审核。

## 螺丝帽短信配置

后台配置路径：

```text
PC后台 -> 系统设置 -> 运营设置 -> 短信验证码服务
```

填写方式：

```text
短信服务：启用
短信服务商：luosimao-sms
短信 Key：留空
短信 Secret/API Key：填螺丝帽完整 API Key，例如 key-xxxx
短信签名：填已审核签名，不带【】
模板 ID：留空
短信 AppID：留空
```

保存后使用后台“发送测试短信”验证。螺丝帽接口要求短信内容末尾带 `【签名】`，后端会自动追加。
