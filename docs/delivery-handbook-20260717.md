# 活动报名平台交付手册

更新时间：2026-07-20

## 1. 交付范围

本手册对应《项目全功能分析报告》和《全功能持续开发计划表》，覆盖 PC 管理后台、移动管理端、H5、微信小程序、API、数据库 migration、部署配置、测试证据和运维流程。

当前版本仍属于持续开发交付候选版。正式支付、短信、微信生产能力、对象存储、生产域名证书、外部告警和真实设备验收完成前，不得标记为最终签收。

## 2. 本地入口

- API：`http://127.0.0.1:3000/api`
- PC/H5：`http://127.0.0.1:18080`
- 健康检查：`/api/health/live`、`/api/health/ready`、`/api/health`
- 应用内浏览器验收必须使用当前项目的浏览器验收脚本或 Codex 应用内浏览器。

## 3. 已确认测试账号

以下账号来自已保留的验收记录，密码仅用于本地/演示环境，生产环境必须重置：

| 用途 | 账号 | 密码 | 备注 |
|---|---|---|---|
| 平台管理员 | `admin` | `Admin123456` | 平台级配置、审计和跨租户验收 |
| Showcase 租户管理员 | `showcase_admin` | `Qiwai123456` | 租户 `23`，活动、报名、会员、商城、装修及运营设置验收 |
| Showcase 财务 | `showcase_finance` | `Qiwai123456` | 租户 `23`，财务、退款和对账验收 |
| Showcase 核销员 | `showcase_checkin` | `Qiwai123456` | 核销、现场工作台和离线清单验收 |
| 会员课程验收 | 手机号 `13990000005` | `Qiwai123456` | 用户 ID `125`，租户 `qiwai-showcase` |
| 课程跨端验收 | 手机号 `13990014006` | 以现有验收记录为准 | 用户 ID `230`，不得在生产复用 |

`showcase_admin` 已于 2026-07-20 恢复并完成当前版本浏览器复验：管理员 ID `130`、角色 `operator`、租户 `23 / 慢π演示中心`，加载 94 项权限。生产部署后仍必须按安全策略强制修改全部演示密码。

## 4. 保留测试数据

- 活动报名、付费订单、退款、核销和现场统计数据：保留在当前数据库，不执行清理脚本。
- 课程 3：免费演示课程；课程 5：付费课程。
- 测验考核 `1`，attempt `2`，客观题 100 分通过。
- 作业考核 `2`，attempt `3`，人工评分 90 分通过。
- 证书编号：`CRS-3-125-MRNU9TMU-72E8`，公开验真接口已验证有效。
- 课程订单 `53`、退款单 `2`：已验证全额退款后学习权限和有效证书联动撤销。
- 客服工单号：`WO202607166563E041`，保留状态机处理轨迹。
- 统计重算批次：`AR178422535724345E6AD`，差异为 0。
- 公益项目 `11`、援助申请 `9`、伙伴合同 `8`、志愿任务 `33` 及志愿证明 `VPR202607162affb9da52ab4268` 保留用于角色验收。

## 5. 常用命令

```powershell
npm run test
npm run test:preflight-guards
npm run audit:runtime
npm run build
npm run build:mobile:mp-weixin
npm run ci:verify
npm run db:backup
npm run monitor:health
npm run drill:rollback:api
```

生产数据库变更必须使用版本化 migration：

```powershell
npm --prefix apps/api run migration:show
npm --prefix apps/api run migration:run
```

恢复前必须明确目标库并设置确认变量，禁止对未知库执行恢复：

```powershell
$env:RESTORE_CONFIRM="activity_registration"
$env:BACKUP_FILE="backups/mysql/activity_registration-YYYYMMDD-HHMMSS.sql.gz"
npm run db:restore
```

## 6. 角色操作摘要

平台管理员负责租户、套餐、权限目录、区域、系统设置、审计、风险告警和全局数据；租户管理员负责本租户员工、活动、会员、内容和经营数据；运营负责活动、报名、通知、内容和营销；财务负责订单、退款、钱包、对账和结算；核销员只能处理已授权活动和核销点；商户/店员只能处理授权店铺；讲师只能处理授权课程；会员在 H5/小程序完成报名、支付、学习、评价、社区和个人资产操作；志愿者完成实名、培训、任务报名、签到、工时和证明流程。

所有角色均应验证：加载中、空数据、接口失败、无权限、重复提交、取消确认和状态失效提示。

## 7. 上线前检查

1. 设置真实 HTTPS、CORS、API、H5 和后台域名。
2. 配置数据库、缓存、对象存储、短信、微信、支付、邮件和告警凭据。
3. 执行 `npm run test:preflight-guards`、`npm run audit:runtime`、`npm run build` 和 `npm run build:mobile:mp-weixin`。
4. 执行 `npm run db:backup`，保存文件大小和 SHA-256。
5. 执行 migration 前后行数、金额、钱包、公益资金和订单一致性校验。
6. 检查 `/api/health/ready` 后再执行 smoke 和角色回归。
7. 生产账号全部改密，关闭演示账号和未配置的真实通道。

## 8. 当前待验收项

- 正式微信支付、支付宝、短信、公众号/小程序消息、SMTP。
- 对象存储私有桶、生产域名 HTTPS、外部 Prometheus/Grafana 和告警 webhook。
- 微信开发者工具真机、相机扫码、真实断网恢复和主流设备兼容性。
- 生产灰度、组合故障回滚和异地私有文件恢复。
- 13.01 至 13.03 的最终全角色 E2E、性能资源曲线和整改复验。

上述项目完成前，交付状态应保持“候选版/待外部验收”。

## 9. 证据索引

- 当前状态：[delivery-status-20260717.md](delivery-status-20260717.md)
- 权限与接口矩阵：[permission-api-matrix-20260717.md](permission-api-matrix-20260717.md)
- 制品校验清单：[delivery-artifact-checksums-20260717.md](delivery-artifact-checksums-20260717.md)
- 安全与发布门禁：[security-release-acceptance-20260717.md](security-release-acceptance-20260717.md)
- H5 首页验收：[browser-h5-home-acceptance-20260717.md](browser-h5-home-acceptance-20260717.md)
- API 回滚演练：[rollback-drill-20260717.md](rollback-drill-20260717.md)
- 上线前检查：[prelaunch-online-showcase-20260717.md](prelaunch-online-showcase-20260717.md)
- 生产运维：[production-runbook.md](production-runbook.md)
- 启动清单：[launch-checklist.md](launch-checklist.md)
- 备份恢复：[backup-restore-drill-20260714.md](backup-restore-drill-20260714.md)
- 监控回滚：[operations-monitoring-rollback-drill-20260714.md](operations-monitoring-rollback-drill-20260714.md)
- 角色验收：[premium-role-acceptance-report.md](premium-role-acceptance-report.md)
- 性能验收：[performance-acceptance-report.md](performance-acceptance-report.md)
- 开发日志：[../DEVELOPMENT_LOG.md](../DEVELOPMENT_LOG.md)
