# 2026-07-29 发布部署与回滚指引

## 本次版本

- 分支：`feature/qiwai-ui-experiment`
- 订单修复提交：`724357976fcb3d78d8765cee989be432c9245818`
- 实际部署提交：以发布通知中的完整提交号为准。该提交必须包含上述订单修复提交。
- 数据库迁移：本次无新增迁移，不执行迁移命令。
- 变更：平台级订单在机构会员视图可见、订单页状态稳定、线下收款转化统计补齐。

## 宝塔部署

在服务器项目目录执行下面整段命令。命令不会清理测试数据、业务数据、备份或未跟踪文件。

```bash
bash <<'BASH'
set -Eeuo pipefail
cd /www/wwwroot/rd.chaimen666.com
export PATH=/www/server/nodejs/v22.22.3/bin:$PATH

PM2=/www/server/nodejs/v22.22.3/lib/node_modules/pm2/bin/pm2
BRANCH=feature/qiwai-ui-experiment
EXPECTED_FULL=__RELEASE_COMMIT_FROM_RELEASE_NOTICE__

git fetch origin "$BRANCH"
git merge --ff-only "origin/$BRANCH"
test "$(git rev-parse HEAD)" = "$EXPECTED_FULL"

COMMIT=$(git rev-parse --short=8 HEAD)
export NODE_ENV=production
export BUILD_COMMIT="$COMMIT"
export BUILD_TIME="$(date -Iseconds)"
export VITE_API_BASE=https://rd.chaimen666.com/api
export VITE_H5_ORIGIN=https://rd.chaimen666.com
export VITE_DEFAULT_TENANT_CODE=qiwai-showcase

npm run build
WEBROOT=/www/wwwroot/rd.chaimen666.com/apps/mobile/dist/build/h5 \
ADMIN_WEBROOT=/www/wwwroot/rd.chaimen666.com/apps/admin/dist \
npm run publish:webroot

"$PM2" restart activity-api --update-env
"$PM2" save
/www/server/nginx/sbin/nginx -t
/www/server/nginx/sbin/nginx -s reload

curl -fsS https://rd.chaimen666.com/api/health/ready
echo
curl -fsS https://rd.chaimen666.com/version.json
echo
curl -fsS https://rd.chaimen666.com/admin/version.json
echo
echo "部署完成：$COMMIT"
BASH
```

## 发布后核对

- `https://rd.chaimen666.com/version.json` 返回发布通知中的前 8 位提交号。
- `https://rd.chaimen666.com/admin/version.json` 返回发布通知中的前 8 位提交号。
- `/api/health/ready` 中 `ready=true`、`api=up`、`database=up`。
- H5 登录后验证“我的订单 - 全部”中的平台级报名。
- 管理后台验证订单、报名、线下确认收款、活动复盘的付费人数和金额。

## 微信小程序

服务器部署不更新微信已发布或体验版的小程序。部署后，在微信开发者工具重新导入以下目录并上传新体验版：

```text
apps/mobile/dist/build/mp-weixin
```

导入后确认 `version.json` 为发布通知中的前 8 位提交号，真机验证首页底部导航、活动详情、我的订单、订单详情和跨租户平台订单。

## 回滚

本次不含数据库迁移。如发布后出现阻断问题，可仅回滚代码和静态产物至部署前已验证提交，再重启 `activity-api` 并重载 Nginx；不回滚或删除数据库数据。
