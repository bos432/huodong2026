# H5、后台与 Nginx 静态制品回滚演练

演练时间：2026-07-20 20:47（Asia/Shanghai）

## 结论

本地受控演练通过。H5 与 PC 后台同时部署故障首页后，Nginx HTTP 探针正确识别候选失败；API 全程保持 ready。脚本自动恢复原始首页，恢复后两个入口哈希、版本文件和 10 个首屏静态资产全部通过。

## 演练范围

- H5：`apps/mobile/dist/build/h5/index.html`
- PC 后台：`apps/admin/dist/index.html`
- Nginx：`activity-nginx`，执行恢复前后 `nginx -t`
- API readiness：`http://127.0.0.1:3000/api/health/ready`
- 对外入口：`http://127.0.0.1:18080/h5/`、`http://127.0.0.1:18080/admin/`

演练不重启 API，不执行 migration，不修改 MySQL、上传卷、私有文件卷或静态 assets 目录。

## 结果

| 项目 | 结果 |
|---|---|
| Nginx 配置 | 故障注入前后均有效 |
| 故障检测 | H5 与后台均返回唯一候选标记，探针判定失败 |
| API 隔离 | 故障期间 `ready=true` |
| H5 基线/恢复 SHA-256 | `9c84e03faa4031382058879df72b7d3e8b59fda9c30a2df364a787766c67f577`，完全一致 |
| 后台基线/恢复 SHA-256 | `3bf1443610e32252ea0aa884301bdbca60ffcfbb12cf950f581b9c6723685a28`，完全一致 |
| H5 版本 | commit `7fead33b` |
| 后台版本 | commit `7fead33b` |
| 首屏资产 | H5 3 个、后台 7 个，全部 HTTP 200 且非空 |
| 自动回滚耗时 | 0.23 秒 |
| 总演练耗时 | 0.74 秒 |

## 浏览器复验

- H5 回到资金异常页面，`#app` 已挂载，故障标记不存在。
- PC 后台回到 `/admin/dashboard`，`#app` 已挂载并显示平台超级管理后台，故障标记不存在。

## 执行与证据

```bash
npm run drill:rollback:static
```

- 实现：`scripts/static-artifact-rollback-drill.mjs`
- 结构化结果：`deploy/static-rollback-drill-result.json`
- 发布门禁：`scripts/preflight-rollback-guard.mjs`

正式生产仍需在真实 CDN、负载均衡、对象存储静态托管和多实例流量环境复演，并验证缓存失效与灰度切流。
