# API 回滚演练记录

演练日期：2026-07-17

## 结果

- `npm run drill:rollback:api`：通过。
- 故障候选镜像 readiness 失败已被检测。
- baseline 镜像自动恢复成功。
- 回滚耗时：6.12 秒。
- 总耗时：15.12 秒。
- 恢复后 `/api/health/ready`：`ready=true`、API up、数据库 up。
- MySQL 13306 端口和数据卷持续正常，演练未执行数据库 migration 或数据写入。

## 证据

- 结果文件：`deploy/rollback-drill-result.json`
- baseline 镜像：`activity-registration-api:rollback-baseline-20260716T193834`
- candidate 镜像：`activity-registration-api:rollback-candidate-20260716T193834`
- baseline image：`sha256:0e9a5ecf56dbfc77a66b864a092fc98b14f67cc4709e37a7c9d715aa3af0f453`

正式生产回滚仍需在生产镜像仓库、域名流量和真实备份策略下复演。
