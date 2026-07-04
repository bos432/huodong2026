# Codex 维护笔记

每次开始修复、提交、推送、部署前，先阅读本文件，并按需检索 `docs/project-issue-history.md`。这里记录本项目已经踩过的坑和固定处理方式，避免反复排查同一个问题。

## 快速原则

- 先看用户最新一句话和截图，不要被旧问题带偏。
- 先读本文件和 `docs/project-issue-history.md`，再 `git status -sb`，再开始改代码。
- 修复线上问题时，优先做小范围、可验证、可回滚的改动。
- 用户经常需要“最终推送到 git + 宝塔终端命令 + 是否需要小程序审核”，收尾时要主动说明。
- 如果改动涉及小程序端，结论里必须明确：需要重新上传体验版并提交审核。只改 API、PC 后台、文档，一般不需要小程序审核。

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

## 已处理问题索引

| 问题 | 相关提交 | 后续再遇到时先看 |
| --- | --- | --- |
| 首页装修图片广告只能一张、多图样式和每图跳转 | `f192d15c`、`17d41bf0`、`87720079`、`8afd59d9`、`8b016995` | `apps/admin/src/views/HomepageBuilder.vue`、移动端首页渲染 |
| 小程序“我的”未登录后无法返回其他页面 | `4ef5ed0c` | `apps/mobile/src/pages/user/*`、登录拦截、tab/switchTab 跳转 |
| 小程序 API 地址兜底导致体验版请求异常 | `7fc0ce13` | `apps/mobile/src/api-base.ts`、`VITE_API_BASE`、构建命令里的环境变量 |
| 超管后台看不到前端存在的活动 | `9d36b084` | PC 后台活动列表默认筛选、租户/平台边界 |
| 活动报名群二维码流程提示 | `2222bae9` | 活动配置、报名成功页/报名详情页，不要在公开活动页直接展示二维码 |
| 手机端管理端活动保存/发布无反应 | `04ac467f`、`158eb2a4`、`bb846179`、`801c23a2` | `apps/mobile/src/mobile-admin.ts`、活动保存/发布请求、错误提示、API payload |
| PC 后台活动提交报错 | `a1944d0f` | `apps/admin/src/views/Activities.vue`、API DTO/payload validation |
| API payload 太大或请求体处理问题 | `abe32ba2` | API body limit、上传/富文本/图片字段 |
| 报名签到码、扫码签到展示 | `05a89bea` | `apps/mobile/src/pages/user/registration.vue`、PC 后台扫码组件、签到权限 |
| 螺丝帽短信接口 | `988f88f0` | `apps/api/src/modules/v1/notification-provider.service.ts`、后台系统设置短信字段 |
| Codex 维护笔记 | `b48dd8a5` | 本文件和 `AGENTS.md` |

## 功能排查重点

### 小程序未登录和“我的”页

- 复现路径：未登录进入“我的”或需要登录的页面，再返回首页/活动页/管理端。
- 要检查页面级 `onShow`、路由守卫、`switchTab`、`navigateBack`、登录弹窗逻辑，避免未登录时自动反复跳回“我的”。
- 头像昵称逻辑：用户第一次登录获取过头像昵称后，后续登录不应每次强制重新获取；只有用户主动修改时才触发获取。
- 改动小程序端后必须构建 `mp-weixin`，并提醒需要重新提交小程序审核。

### 手机端管理端活动发布

- 这是反复出现过的问题，不要只看 PC 后台。
- 复现要覆盖：手机端管理登录、创建活动、保存草稿、发布、编辑再保存、不同角色权限。
- 点击无反应时先查：按钮 loading/disabled、表单校验是否静默失败、请求是否发出、API 路径、tenant code、错误 toast 是否被吞。
- 后端同步查：API DTO、字段类型、必填默认值、payload 大小、租户权限。

### PC 后台活动提交

- PC 后台报错时，不要只改前端表单；要同时看 API validation、DTO、实体字段和保存服务。
- 超管看不到活动时，优先看默认筛选和租户隔离逻辑，不要误判为数据丢失。

### 二维码和签到

- 入群二维码：活动页公开浏览不直接展示二维码；报名成功/报名详情里应有流程提示。活动未单独配置时使用系统默认入群二维码。
- 签到码：用户报名审核通过后，报名详情应能看到签到二维码/签到码；现场扫码签到由有权限的管理员或签到员操作。
- 改二维码渲染时同时检查 H5 和小程序，尤其小程序 canvas 生成二维码能力。

### 首页装修图片广告

- 图片广告应支持多张图片。
- 每张图片应能单独设置跳转链接。
- 后台不要显示类似“两张轮播”这种无必要提示。
- 改后台编辑器后，要检查前端首页渲染、多图轮播、单图样式、跳转链接、空图占位。

### 短信验证码

- 当前真实短信服务商为 `luosimao-sms`。
- 不要再按腾讯云强制要求模板 ID 或 SDK AppID。
- 后台测试短信失败时，先查后台保存的运营设置，再查 `h5_code_logs`，再查服务商返回错误。

## 全流程测试和交付

- 上线运营中，不要随意清理测试数据；用户明确要求保留测试数据时，测试账号、活动、报名、签到记录都要留下。
- 重要修复后尽量覆盖这些角色：平台超管、商家/租户管理员、手机端管理员、签到员、普通报名用户。
- 活动主流程要覆盖：创建活动、保存草稿、发布、前端查看、报名、支付/线下确认、报名成功入群提示、签到码展示、扫码/核销签到、后台查看报名和活动列表。
- 交付文档至少包含：后台地址、账号角色、操作路径、活动发布教程、报名/签到教程、短信配置、部署命令、小程序审核说明、已知限制和回滚方式。
- 如果用户要求“右边浏览器/微信开发者工具走一遍”，要实际操作验证，不要只凭代码推断。

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

### 部署常见坑

- 宝塔终端里不要使用会弹交互确认的命令。复制 env 文件要用 `\cp -f`，避免卡在 `cp: overwrite '.env'?`。
- PM2 路径使用 `/www/server/nodejs/v22.22.3/lib/node_modules/pm2/bin/pm2`，不要用不存在或不稳定的 `/www/server/nodejs/v22.22.3/bin/pm2`。
- 不要随意 `pm2 delete` 再 `pm2 start`，之前出现过 `Script already launched`。优先 `restart activity-api --update-env`。
- 如果外网 `https://rd.chaimen666.com/api/health/ready` 返回 502，先检查本机 API：

```bash
curl -i --max-time 10 http://127.0.0.1:3000/api/health/ready || true
$PM2 list
$PM2 logs activity-api --lines 80
/www/server/nginx/sbin/nginx -t
```

- `BUILD_COMMIT` 没更新时，必须在服务器 `.env` 和 `apps/api/.env` 写入当前 `git rev-parse --short HEAD`，然后 `pm2 restart --update-env`。
- 部署后必须确认 health 返回里的 `release.commit` 是最新提交。

## 小程序审核判断

- 只改 `apps/api`、`apps/admin`、`docs`、`deploy`：通常不需要重新提交小程序审核。
- 改 `apps/mobile` 或 `scripts/patch-mobile-mp-weixin-auth.mjs`：需要重新构建小程序、上传体验版并提交微信审核。
- 改品牌名称、Logo、首页装修数据等后端配置：H5/后台可即时生效；小程序如果代码或内置默认值没变，一般不需要审核，但线上小程序端缓存/配置读取要实测。
- 给用户答复时要明确“需要/不需要审核”的原因。

## 服务器命令输出判断

- `git pull --ff-only` 成功后，注意输出的提交范围。
- `npm --prefix apps/mobile run build:mp-weixin` 成功后仍需要微信开发者工具导入 `apps/mobile/dist/build/mp-weixin` 上传。
- `npm --prefix apps/admin run build` 成功会写 `apps/admin/dist/version.json`。
- `npm --prefix apps/mobile run build:h5` 成功会写 `apps/mobile/dist/build/h5/version.json`。
- `curl https://rd.chaimen666.com/api/health/ready` 返回 `ready:true` 但 `config:warning` 不一定阻断上线，要看 warning 内容。

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
