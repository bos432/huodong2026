# 活动报名商业闭环验收报告

## 1. 验收范围

本报告记录计划 `02.05-02.07` 的真实 MySQL、API、Excel 和浏览器验收：动态报名表单版本、资格限制、同行人、隐私授权、批量审核/通知/标签、名单导出、签到后评价、主办方回复、精选、举报治理和活动复盘。

- API 结果：`.local-logs/activity-commerce-acceptance-1784204514616/result.json`
- 浏览器结果：`.local-logs/browser-activity-commerce-20260716122208/result.json`
- 租户：`23 / qiwai-showcase`
- 执行命令：`npm run acceptance:activity-commerce`、`npm run browser:activity-commerce`
- 执行环境：最终 Docker API + MySQL 8.4 + Nginx H5/PC

## 2. 数据库缺陷与整改

首次创建包含 `number` 和 `region` 字段的活动时，API 返回 MySQL 500：`Data truncated for column 'type'`。源码、DTO、PC 和 H5 已支持 13 种字段类型，但真实数据库 `activity_fields.type` 仍是早期 6 值枚举。

整改内容：

- 新增 migration `1783810000000-ActivityFieldTypes.ts`。
- 枚举扩展为 `text`、`single_choice`、`multiple_choice`、`phone`、`id_card`、`remark`、`email`、`number`、`date`、`date_time`、`region`、`address`、`attachment`。
- 回滚前检查是否已有新字段类型数据，存在时拒绝回滚，防止 MySQL 静默截断。
- migration contract 和发布前 migration guard 固定检查全部 13 种类型。
- 真实数据库已执行 migration，`SHOW COLUMNS` 与源码枚举一致。

## 3. API 与数据验收

保留活动：`152 / 【活动商业闭环验收保留】1784204514616`。

| 场景 | 结果 |
| --- | --- |
| 手机号黑名单 | 返回 400，禁止报名 |
| 隐私授权未勾选 | 返回 400 |
| 年龄低于 18 岁 | 返回 400 |
| 地区不在浙江/杭州 | 返回 400 |
| 同行人超过 1 人 | 返回 400 |
| 同一会员重复报名 | 返回 400 |
| 表单版本 | V1 为 4 字段，V2 为 5 字段，版本自动从 1 增至 2 |
| 报名快照 | 报名 `10389/10390` 分别冻结 V1/V2 字段定义 |
| 隐私和同行人 | 同意时间与同行人快照保留 |
| 批量运营 | 2 条审核、通知和标签均成功，无失败项 |
| 名单导出 | `registrations.xlsx`，7,131 bytes，内容包含活动标题 |
| 评价资格 | 两条报名签到后才可评价 |
| 评价治理 | 评价 `7/8`，主办方回复、精选和公开展示通过 |
| 举报治理 | 举报 `3` 驳回；重复举报返回同一记录；举报本人被拒绝 |
| 活动复盘 | 报名 2、签到 2、评价 2、通知 4，指标口径一致 |
| 复盘导出 | `activity-recap.xlsx`，8,857 bytes，含复盘概览、邀请榜、评价 3 个工作表 |

测试会员：

- `13704514616 / Qiwai123456`：V1 报名、同行人、评价。
- `13804514616 / Qiwai123456`：V2 报名、评价和举报。
- `13504514616 / Qiwai123456`：黑名单限制和浏览器待处理举报。

脚本临时开启租户报名审核配置，结束后回读确认恢复 `registrationReviewEnabled=false`、套餐仍为 `standard`。

## 4. 浏览器验收

H5 390x844 与 PC 1440x1000 共 5 项通过：

1. H5 活动详情。
2. H5 V2 动态表单、同行人和隐私政策。
3. PC 报名批量通知、标签、打印和筛选导出入口。
4. PC 评价精选、主办方回复和待处理举报 `4`。
5. PC 活动复盘指标与 Excel 导出入口。

截图位于 `.local-logs/browser-activity-commerce-20260716122208/`：

- `h5-activity-detail.png`
- `h5-registration-form-v2.png`
- `admin-registration-operations.png`
- `admin-review-governance.png`
- `admin-activity-recap.png`

## 5. 关联既有证据

本批与以下既有结果共同覆盖 `02.05-02.07`，不以浏览器页面存在替代服务端验证：

- 附件鉴权、文件魔数、MIME、大小限制：上传安全专项和动态安全验收。
- 付款超时、取消、候补补位和写锁：既有活动 smoke、并发验收及候补流程。
- 批量通过/拒绝与审计：`acceptance:functional-upgrades`。
- 退款联动和剩余可退容量：`acceptance:registration-refund-concurrency`、`acceptance:refund-concurrency`。
- 大名单分页、现场概览和完整导出：`docs/performance-acceptance-report.md`。

## 6. 回归与制品

- API：92 个测试文件、542 项用例全部通过。
- 全部 preflight guards 通过。
- Shared、API、PC、H5 和微信小程序构建通过。
- 最终 API 镜像：`sha256:2d8aa38f0f031fab6ab1c9275fd90a02df106e9acd413fecceff3da9be7c449a`。
- 新镜像上健康监控 `ok`、告警 0，完整线上演示 smoke 通过。
- 数据库备份：`backups/mysql/activity_registration-20260716-202343.sql.gz`。
- 备份大小：875,041 bytes；解压后 12,263,557 bytes。
- SHA-256：`5B41F9933540BA293168D510F9FED37C6A8029957716C0326DC62C99E19D210A`。
- 备份包含 migration、活动字段结构和活动 `152` 保留数据。

## 7. 结论

`02.05-02.07` 的本地生产形态数据库、API、导出和浏览器验收完成，无未整改的阻塞或高风险缺陷。微信小程序真实设备上的表单输入、附件选择和分享仍归入全项目真机验收，不影响本批服务端及 H5/PC 完成判定。
