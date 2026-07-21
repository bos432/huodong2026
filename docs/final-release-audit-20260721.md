# 最终发布审计（2026-07-21）

## 结论

- 本地源码、构建、测试、浏览器验收、交付包和运行健康检查均已通过，可以进入 Git 提交与服务器部署阶段。
- 当前工作树仍有大量既有未提交源码和文档；这些内容必须在推送前形成一次完整提交，不能只推送当前 `7fead33b`。
- 当前 `origin` 指向本地仓库 `E:\2027\活动报名\活动报名`，推送 GitHub 时需使用项目发布文档中的显式 GitHub 地址，或先正确配置远端。
- 正式支付、微信、短信、对象存储和生产域名仍属于服务器环境配置及生产窗口验收，不影响本地代码发布门禁结论。

## 验证结果

- `npm run codex:release-check`：8 个命令全部通过，0 失败、0 阻塞；包含 doctor、全部 preflight、发布预检、174 个 API 测试文件 992 项测试、全端生产构建、小程序构建及两组浏览器验收。
- `npm run security:secrets`：检查 1,343 个已跟踪或应提交文件，未发现私钥或常见云平台令牌。
- `npm run verify:delivery-package -- delivery/activity-registration-candidate-20260721-r38.zip`：通过，3,262 个 ZIP 条目、3,130 个 Manifest 文件、禁入条目 0。
- `npm run verify:delivery-source -- delivery/candidate-20260721-r38/source`：全部源码 preflight 通过。
- `npm run monitor:health`：`status=ok`、`alerts=0`。
- Docker：`activity-api`、`activity-mysql` healthy，`activity-nginx` running。
- `git diff --check`：退出 0，仅有 Windows 换行符提示。
- 最终候选 `delivery/activity-registration-candidate-20260721-r39.zip`：33,346,906 bytes，SHA-256 `7A8939B61CC52F5BA6CC9E852280A2870AF79E3D5098E8A19A5B3D8A889B94EC`，3,264 个 ZIP 条目、3,132 个 Manifest 文件。
- 生产种子保护更新后的最终候选为 `delivery/activity-registration-candidate-20260721-r40.zip`：33,349,543 bytes，SHA-256 `47CCA15A0BDB77240FE1D7FF46D91D514942E59B79A3D7F777A5D6EBF99BC889`，3,264 个 ZIP 条目、3,132 个 Manifest 文件。
- 公益凭证姓名与预览整改后的最终候选为 `delivery/activity-registration-candidate-20260721-r41.zip`：33,354,792 bytes，SHA-256 `4077565F706B6A9DC5BA77662AE08C9A290843B1C8EE171BDFCDC30E75165129`，3,266 个 ZIP 条目、3,134 个 Manifest 文件。

## Git 边界整改

发布前检查发现本地静态发布副本、发布备份、本地 Node 工具以及候选包解包目录未被忽略，直接执行 `git add -A` 会额外加入七万余个生成文件。现已补充 `.gitignore`，不删除任何文件或数据：

- `.deploy-backups`
- `.local-tools`
- `/admin`
- `/assets`
- `/version.json`
- `/delivery/candidate-*`
- `/delivery/activity-registration-candidate-*.zip`

整改后未跟踪内容集中在正式源码、数据库迁移、测试、CI、脚本、验收文档和 `交付包-20260711` 项目资料。历史候选包、数据库备份、私有数据备份、上传文件和本地运行数据均保留在磁盘，但不会被误提交。

## 上传前检查

1. 使用 `git status --short` 审阅待提交源码，确认 `.env`、备份、日志、上传文件、静态构建副本和 delivery 候选包未进入暂存区。
2. 完整提交本轮源码、迁移、测试、脚本、CI 和验收文档，避免只提交部分新实体或迁移。
3. 推送目标分支 `feature/qiwai-ui-experiment`，并在服务器使用 `git pull --ff-only`。
4. 服务器按 `docs/launch-checklist.md` 和 `docs/production-runbook.md` 配置生产环境、执行迁移、构建、重启、健康检查和核心流程冒烟。

## 生产数据初始化

- 正式上线推荐使用全新空数据库执行迁移，不恢复候选包内用于验收留档的本地数据库备份。
- `NODE_ENV=production` 时 API 仅初始化默认管理员、会员等级和首页基础装修，不再创建“沙龙/读书/共创”演示分类及两条英文演示活动。
- 本地测试库继续保留用于回归和审计，不执行跨业务表物理删除。
