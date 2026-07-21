# 活动漏斗归因与复盘版本治理验收报告

## 1. 验收结论

本报告对应持续开发计划 `11.01.49`。活动漏斗已形成“统一转化事件账本 + 数据库幂等去重 + 报名归因冻结 + 票种/渠道/城市拆分 + 逐阶段与金额对账”的闭环；活动复盘已形成“实时数据 + 不可变历史版本 + 内容与指标冻结 + 权限化 Excel 导出 + 审计追踪”的闭环。

验收结论：通过。专项测试、API 全量测试、Shared/API/PC/H5/微信小程序构建、完整 preflight、隔离库 migration `up/down/up`、主库 migration、真实 API、数据库审计、应用内浏览器桌面/移动验收、Docker 健康和 readiness 均通过。

生产短信、支付、微信、对象存储、正式域名、HTTPS 和生产密钥仍属于上线前外部配置项，不影响本批业务代码和本地真实数据验收结论。

## 2. 转化事件与幂等治理

- `conversion_events.idempotencyKey` 增加数据库唯一索引，公共、后台、V1 和退款完成事件统一使用竞争安全的 `INSERT IGNORE + updateEntity(false)`。
- 活动浏览日键按北京时间自然日生成；相同活动、IP、日期和来源的并发访问只记录一次。
- 历史报名、支付、核销、评价、分享、取消、退款和缺失浏览事件已回填。
- 撤销核销同步删除对应核销事件，避免复盘继续统计已撤销到场记录。
- 免费订单和候补补位补齐实时 `register/pay` 事件，不再依赖后续统计修复。
- 所有下游支付、核销、评价、取消和退款事件沿用报名时冻结的归因快照。

第一批真实并发证据：`.local-logs/conversion-event-governance-1784422960330/result.json`。20 路相同访问请求全部返回 200，数据库只生成 1 条转化事件和 1 条浏览日志。

## 3. 票种、渠道与城市归因

- 活动增加明确的省、市、区字段，后台活动表单可维护行政区。
- 报名冻结来源、渠道、省市区和捕获时间；转化事件冻结票种 ID/名称、渠道代码/名称及省市区。
- 单活动漏斗统一从 `conversion_events` 账本计算，不再混用报名、订单、核销和评价表的即时状态。
- 返回票种、渠道和城市三类拆分，每类均覆盖浏览、分享访问、报名、支付、审核通过、核销、评价、取消、退款、毛额、退款额和净额。
- 净额为有符号 `grossAmountFen - refundAmountFen`，跨期退款不会被错误截零。
- 城市只使用活动明确行政区；无法可靠判断的历史数据归为“未知”，不会使用租户授权区域冒充活动城市。
- 每个维度均返回逐阶段和金额对账结果，三类维度合计与漏斗总览一致。

## 4. 复盘历史版本

- 新增 `activity_recap_versions`，保存活动、租户作用域、连续版本号、完整指标快照、总结、问题、行动项、图片、创建人和创建时间。
- 新建版本使用事务、活动行锁和唯一约束；并发创建稳定生成连续且唯一的 `v1/v2`。
- 数据库 trigger 禁止历史版本 UPDATE 和 DELETE，历史指标和内容不会随实时数据变化。
- 复盘支持实时视图、版本列表和指定历史版本查询。
- 指定版本 Excel 导出包含概览、票种、渠道、城市、邀请榜、评价和复盘内容。
- 创建版本和导出均写管理员操作审计，记录活动、版本和请求上下文。

## 5. 权限边界

| 能力 | 权限 |
|---|---|
| 查看漏斗、实时复盘和历史版本 | `analytics.view` |
| 创建不可变复盘版本 | `analytics.manage` |
| 导出实时或指定版本复盘 | `analytics.export` |

- PC 菜单和路由已从 `activity.view` 收口为 `analytics.view`。
- 新增 `/admin/analytics/activity-options`，分析账号不需要额外获得活动管理权限即可选择授权范围内活动。
- 只读账号不显示版本编辑和导出入口；版本维护账号只显示创建入口；导出账号只显示导出入口。
- 后端接口独立执行权限和租户/岗位活动数据范围复核，不能依赖前端按钮隐藏。

## 6. 真实数据与对账

最新真实专项：`.local-logs/activity-funnel-recap-1784425891715/result.json`。

| 对象 | 结果 |
|---|---|
| 保留活动 | `#149 / [PERF] 10k registration acceptance` |
| 商家 / 城市 | `#23 / Zhejiang / Hangzhou / Xihu` |
| 报名 / 支付 | 10200 / 200 |
| 票种 / 渠道 / 城市拆分 | 1 / 4 / 2 行 |
| 归因不一致 | 0 |
| 并发版本 | `v1/v2` 连续且唯一 |
| 浏览器创建版本 | `v3` |
| 历史 / 实时浏览量 | 1 / 2 |
| 指定版本 Excel | 12719 bytes |

票种、渠道和城市三类对账中，浏览、分享访问、报名、支付、审核通过、核销、评价、取消、退款、毛额、退款额和净额全部为 `true`。

主库审计：

- 10543 条报名的归因必填字段缺失为 0。
- 11416 条转化事件的幂等键重复为 0。
- 报名与下游事件的冻结归因不一致为 0。
- 活动订单总额仍为 1498602 分，退款总额仍为 224045 分，迁移未改变资金汇总。
- 主库 migration 最新显示 `ActivityFunnelAttribution1783910000000` 和 `ActivityRecapVersions1783920000000` 均为 `[X]`。

## 7. Migration 与数据保护

- 迁移前备份：`backups/mysql/activity_registration-20260719-093034.sql.gz`。
- 隔离库：`activity_registration_funnel_recap_test`。
- `1783910000000-ActivityFunnelAttribution` 和 `1783920000000-ActivityRecapVersions` 均完成 `up/down/up`。
- 主库实际 migration 记录为 185 条；`migration:show` 显示到编号 186，差异来自历史序号空缺，不是迁移缺失。
- 复盘版本表使用外键、唯一索引、作用域索引和不可变 trigger；旧数据迁移后数量与金额已复核。

## 8. PC 与浏览器验收

- 漏斗页展示总览、退款/净额、票种、渠道和城市拆分。
- 复盘页支持实时/历史切换、历史版本选择、版本创建、内容查看和权限化导出。
- 活动编辑页可维护省、市、区。
- 桌面和 390x844 视口下页面无横向溢出，复盘移动工具栏已改为分行布局，标题不再被挤成竖排。
- 浏览器控制台 warning/error 均为 0。

截图：

- `.local-logs/activity-funnel-recap-1784425891715/browser-funnel-desktop.png`
- `.local-logs/activity-funnel-recap-1784425891715/browser-funnel-mobile-390x844.png`
- `.local-logs/activity-funnel-recap-1784425891715/browser-recap-desktop.png`
- `.local-logs/activity-funnel-recap-1784425891715/browser-recap-mobile-390x844.png`

应用内 Browser 未捕获文件下载事件并发生等待超时，但页面无报错；真实 API 已确认 XLSX 状态 200、Content-Type 正确且文件非空，因此导出结论以服务端真实响应为准。

## 9. 保留测试账号

密码均为 `Qiwai123456`：

| 账号 | 权限 |
|---|---|
| `showcase_funnel_recap_readonly` | 漏斗与复盘只读 |
| `showcase_funnel_recap_manager` | 查看并创建复盘版本，无导出 |
| `showcase_funnel_recap_exporter` | 查看并导出，无版本编辑 |

测试活动 `#149`、复盘 `v1-v3` 和上述账号均保留，供后续交付验收复用。

## 10. 自动化与发布门禁

| 检查 | 结果 |
|---|---|
| 本批专项 | 4 个文件，59 项通过 |
| API 全量测试 | 147 个测试文件，836 项通过 |
| Shared/API/PC/H5 构建 | 通过 |
| PC 构建 | 1946 模块 |
| 微信小程序构建 | 通过 |
| 真实专项与数据库对账 | 通过，归因差异 0 |
| 完整 `npm run preflight` | 2026-07-19 修复后复跑通过 |
| Docker | API、MySQL healthy，Nginx running |
| readiness | `ready=true`、blocking 0 |
| `git diff --check` | 通过，仅既有 CRLF 提示 |

完整 preflight 仅提示生产短信凭据可从环境变量或后台配置中心补齐；readiness 中 15 个 before-launch 和 5 个 optional 项均为生产环境配置，不是当前代码阻塞。

## 11. 复测命令

```powershell
npm run acceptance:activity-funnel-recap
npm test
npm run build
npm run build:mobile:mp-weixin
npm run preflight
npm --prefix apps/api run migration:show
docker compose -p activity-registration ps
Invoke-RestMethod http://127.0.0.1:3000/api/health/ready
git diff --check
```
