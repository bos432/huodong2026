# 慢π 20261008-baf06e7e 受控发布手册

候选包：`manpi-release-20261008-baf06e7e.tar.gz`

SHA-256：`739f35bb201d4560406fa36c1e12f45f9ea30792d59a4e197fce7169da488462`

生产基线：`7878b735961c921ca62a2b893ceb78c69272fbb3`

目标版本：`baf06e7e4af255a71a4d5b46290a419016d20539`

## 服务器终端

将压缩包上传到服务器私有目录后，在宝塔终端执行：

```bash
set -e
ROOT=/www/wwwroot/rd.chaimen666.com
RELEASE_ID=20261008-baf06e7e
PRIVATE=/www/backup/activity-releases/$RELEASE_ID
mkdir -p "$PRIVATE"
tar -xzf "$PRIVATE/manpi-release-20261008-baf06e7e.tar.gz" -C "$PRIVATE"
cd "$ROOT"
export RELEASE_ID
node "$PRIVATE/bundle/scripts/deploy-scoped-release.mjs" prepare
node "$PRIVATE/bundle/scripts/deploy-scoped-release.mjs" migrate
node "$PRIVATE/bundle/scripts/deploy-scoped-release.mjs" publish
node "$PRIVATE/bundle/scripts/deploy-scoped-release.mjs" verify
curl -fsS https://rd.chaimen666.com/api/health/ready
curl -fsS https://rd.chaimen666.com/version.json
```

只允许重启 `activity-api` 和 `activity-worker`。脚本会先备份数据库、旧构建和配置，并在 API 健康检查通过后切换静态资源。任何一步失败都停止，不要删除旧版本目录。

## 不在本次脚本中完成

- 不打开 `REAL_PAYMENT_ENABLED`。
- 不写入支付密钥、AccessKey、短信密钥或微信 Secret。
- 不提交微信审核或发布线上小程序。
- 不把演示活动、测试用户或 mock 订单计入正式经营数据。
