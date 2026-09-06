# 2026-09-06 受控发布

## 授权与边界

- 用户允许提交并推送现有分支、发布服务器、将六场演示活动发布到独立商家；不得影响其他服务。
- 目标：`rd.chaimen666.com`，目录 `/www/wwwroot/rd.chaimen666.com`，数据库 `127.0.0.1:3306/reader`。
- 只允许重启该目录的 `activity-api`、`activity-worker`；不重启 Nginx、MySQL、Redis 或其他站点，不变更功能开关。
- 六场活动使用 `manpi-demo` 独立商家、`isTest=true`，生产接口禁止真实报名与付款。只导入内容与本地封面，不导入本地账号、报名、订单、评价或 SQL。

## 发布步骤

1. 明确文件清单后提交、推送 `feature/qiwai-ui-experiment`。本地日志、运行凭据、截图分析和商业计划书不在提交内。
2. 设置生产 `VITE_API_BASE=/api`、`VITE_H5_ORIGIN=https://rd.chaimen666.com`、完整 `BUILD_COMMIT`，本地构建 API、后台、H5。
3. 运行 `scripts/assemble-scoped-release.mjs`，通过面板上传生成的包至私有 `/www/backup/activity-releases/<releaseId>/`，比对 SHA-256 后解压。
4. 在站点根目录设置 `RELEASE_ID`，用 Node 22 执行包内 `scripts/deploy-scoped-release.mjs prepare`。备份仅本站数据库、旧构建和环境文件，等待压缩流关闭并校验 gzip。
5. Git 快进至目标提交；运行同一脚本 `migrate`，只接受明确列出的六项迁移，发现其他待迁移项则停止。
6. 运行 `publish`，仅更新本站两个进程。新 API ready 后才替换前端入口，保留旧哈希资源防止已有页面动态加载失败。
7. `NODE_ENV=production DEMO_CONFIRM=rd.chaimen666.com/reader/manpi-demo node scripts/seed-production-demo.mjs --apply`。默认不加 `--apply` 仅预览；已有非本脚本商家或活动则中止，重复执行保留已有演示内容。
8. 检查健康、Worker、前后端版本、六场演示内容、封面及商家隔离；运行 `verify` 比对进程。不要执行会改全站开关的生产全量烟测。

## 回退

- `/www/backup/activity-releases/<releaseId>/` 保留数据库、旧构建和环境备份，权限仅管理员可读。
- API 原目录另存 `apps/api/.previous-<releaseId>`。失败时只恢复本站 API 和前端入口、对应环境元数据，再重启本站两个进程。
- 本次数据库迁移是新增表/字段；不盲目执行 down 或恢复整库，避免覆盖发布后的真实业务数据。
- 发布 H5/后台/API 不等于微信小程序审核发布；小程序包仍需微信上传与审核流程。

## 发布前检查

- 上一轮 API：210 文件、1143 项通过。
- 本轮跨端与演示边界测试：7 文件、21 项通过；密钥扫描通过。
- 截图的实际视觉复核受当前会话图像读取能力限制，不能将 DOM 检查当作视觉验收。
