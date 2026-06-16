# 多机构隔离推进计划

当前系统已具备平台级活动报名、地区代理收款和代理结算能力。多机构隔离会影响几乎所有核心表、后台权限、公开端入口、支付回调和导出，对现有业务面很宽，因此必须分阶段推进，不能只加一个 `tenantId` 字段后直接上线。

## 当前挡板

生产配置默认保持：

```bash
MULTI_TENANT_ENABLED=false
MULTI_TENANT_SCHEMA_IMPLEMENTED=false
MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED=false
MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED=false
MULTI_TENANT_PREFLIGHT_PASSED=false
MULTI_TENANT_PREFLIGHT_RESULT_FILE=deploy/tenant-smoke-result.json
MULTI_TENANT_PREFLIGHT_MAX_AGE_HOURS=168
```

只有以下四项全部完成并在预发环境验收后，才允许打开 `MULTI_TENANT_ENABLED`：

1. 数据模型和历史数据迁移完成。
2. 后台管理员机构权限过滤完成。
3. H5/公开接口机构定位边界完成。
4. 跨机构越权、导出、支付回调和结算用例验收完成。

## 数据模型

已新增 `Tenant` 实体，并通过 `1780519000000-TenantSchemaSeed` 迁移创建默认平台机构 `platform`。第一批迁移保持 `tenantId` nullable 并回填历史数据，待写入归属、查询过滤和公开端边界完成后，再逐步收紧为关键表必填。

`Tenant` 表字段包含：

| 字段 | 说明 |
| --- | --- |
| `id` | 机构 ID |
| `name` | 机构名称 |
| `code` | 对外短码，可用于 H5 路由或域名映射 |
| `enabled` | 是否启用 |
| `settings` | 机构级扩展配置 |

第一批应加 `tenantId` 的表：

| 表 | 原因 |
| --- | --- |
| `admin_users` | 管理员归属机构，超级管理员可为空或平台级 |
| `agents`、`agent_payment_accounts`、`agent_settlements`、`agent_settlement_transfers` | 代理收款和结算必须按机构隔离 |
| `activity_categories`、`activities`、`ticket_types`、`coupons` | 活动运营资产必须按机构隔离 |
| `registrations`、`orders`、`refunds`、`payment_transactions`、`payment_callback_logs`、`payment_statement_records` | 报名、订单、支付、退款和对账必须按机构隔离 |
| `operation_settings`、`homepage_sections`、`announcements` | 运营配置和首页内容必须按机构隔离 |
| `member_profiles`、`member_point_logs`、`user_tags` | 会员运营数据需确认是平台共享还是机构隔离；默认先按机构隔离处理 |

历史数据迁移策略：

1. 创建默认机构，例如 `platform`。已完成。
2. 给核心表添加 nullable `tenantId`。第一批核心交易链路已完成。
3. 回填所有历史数据到默认机构。第一批核心交易链路已完成。
4. 调整唯一索引，例如活动分类、优惠码、退款号、支付流水等需要从全局唯一评估为 `(tenantId, code/no)` 组合唯一。
5. 代码读写全部带 tenant 后，再把关键表 `tenantId` 改为 not null。

## 后台权限

后台权限建议分为两层：

| 角色 | 范围 |
| --- | --- |
| 平台超级管理员 | 可跨机构管理租户、系统配置和全局审计 |
| 机构管理员/运营/财务/签到 | 只能访问当前机构数据 |

后台 API 必须统一从登录态解析 `tenantId`：

- 列表、详情、导出统一追加机构过滤。
- 创建活动、票种、优惠码、代理、结算单时自动写入当前机构。
- 更新、删除、审核、退款、结算、打款前必须校验目标对象属于当前机构。
- 操作日志记录 `tenantId`，便于审计跨机构操作。

当前已抽出 `src/shared/tenant-scope.ts` 共享规则：

- `applyTenantScopeToQuery` 统一给后台查询追加 `tenantId` 条件。
- `assertTenantAccessForActor` 统一拦截机构管理员访问其他机构资源，同时兼容历史 `tenantId` 为空的数据。
- `tenantRelationForActor` 统一写入当前管理员机构归属。

## 公开端边界

H5 和公开 API 必须先确定机构定位规则，建议优先级：

1. URL query 中的 `tenantCode`。已作为第一批入口完成。
2. 请求头 `x-tenant-code`。已作为第一批入口完成。
3. 独立域名映射机构，通过 `Tenant.settings.domain` 或 `Tenant.settings.h5Domain`。已作为兼容入口完成。
4. 活动分享链接携带活动 ID 时，通过活动反查机构。

支付回调要特别处理：

- 真实支付回调先解析订单号。
- 通过订单反查机构和代理。回调日志、支付流水和对账差异已继承订单机构。
- 再使用该订单锁定代理的支付账户验签。
- 不允许通过请求参数直接指定机构来决定验签配置。

## 验收用例

多机构开启前，至少通过这些用例：

| 场景 | 预期 |
| --- | --- |
| A 机构运营查看活动列表 | 只能看到 A 机构活动 |
| A 机构财务查看订单/退款/对账/导出 | 只能看到 A 机构数据 |
| A 机构管理员访问 B 机构详情 ID | 返回 404 或无权限 |
| A 机构活动下单 | 订单、报名、支付流水写入 A 机构 |
| 代理收款 | 只能使用订单所属机构下的代理支付账户 |
| 支付回调 | 通过订单定位机构和代理，不接受外部指定机构覆盖 |
| 结算生成 | 只能基于当前机构代理和订单生成 |
| 首页/公告/运营设置 | H5 按机构展示对应内容 |
| Excel 导出 | 不含其他机构数据 |

已补充自动化规则测试：

- `apps/api/src/modules/admin/admin-tenant-scope.spec.ts` 覆盖后台租户查询过滤、超级管理员全局视角、跨机构资源拦截、同机构访问和历史空租户兼容。
- `apps/api/src/modules/public/public-tenant-scope.spec.ts` 覆盖公开端 `tenantCode`/域名规范化，以及活动、订单跨机构访问拦截。
- `apps/api/src/modules/public/payment-provider.service.spec.ts` 覆盖真实支付回调预解析忽略外部机构提示、按订单代理选择收款配置，以及代理支付账户机构与订单机构不一致时拒绝验签。
- `scripts/tenant-smoke.mjs` 提供预发 A/B 机构端到端验收入口，覆盖后台活动、首页配置、运营设置、公告、公开端 `tenantCode`、跨机构详情访问、报名导出、订单支付入口、沙箱回调归属、代理结算列表/详情/导出隔离；完整通过后写入 `deploy/tenant-smoke-result.json`，供生产 `preflight` 校验。
- `deploy/tenant-smoke-result.example.json` 提供多机构预发结果模板，只用于说明结果结构；真实预发执行仍必须由 `npm run smoke:tenant` 写入 `deploy/tenant-smoke-result.json`。
- `scripts/tenant-smoke-seed.mjs` 提供 A/B 机构验收数据准备入口，可幂等创建或更新两个机构、operator 管理员、finance 管理员、smoke 代理和代理支付账户。
- `scripts/preflight.mjs` 在 `MULTI_TENANT_ENABLED=true` 或 `MULTI_TENANT_PREFLIGHT_PASSED=true` 时会要求验收结果存在、`passed=true`、未超过有效期、A/B 机构不同，且运营内容、活动边界、导出边界、支付边界和结算边界关键检查项全部通过。结果文件的必需检查键为：`operationContent`、`activityBoundary`、`exportBoundary`、`paymentBoundary`、`settlementBoundary`。

仍需补充的预发验收：

- 支付回调归属预发验收：自动化规则测试和 `smoke:tenant` 沙箱回调段已覆盖，仍需在预发 A/B 机构数据集里实际跑通。
- 首页/公告/运营设置租户化：后端已完成第一批过滤，`homepage_sections`、`announcements`、`operation_settings` 已接入 `tenantId` 迁移、实体关系、后台按管理员机构写入/过滤，以及公开端按 `tenantCode`/域名读取。
- Excel 导出和结算生成的端到端预发用例：`smoke:tenant` 已解析报名导出和代理结算导出 Excel，并验证 A/B 机构列表、详情和导出不串机构；仍需在预发数据库实际跑通后保留验收结果文件。

## 推进顺序

1. 新增 `Tenant` 实体、迁移和默认机构初始化。
2. 给低风险配置表和后台管理员表添加 `tenantId`。
3. 给活动、票种、优惠码、代理和支付账户添加 `tenantId`。
4. 给报名、订单、退款、流水、回调日志、账单记录和结算记录添加 `tenantId`。
5. 抽出后台 tenant scope helper，统一给查询和写入加约束。已完成，并沉淀为共享 `tenant-scope` helper。
6. 补 H5 机构定位和公开接口过滤。第一批活动/报名/支付边界已完成。
7. 补支付回调、退款、结算、导出的机构隔离测试。后台/公开端越权规则、运营内容后端隔离、支付回调归属专项和 A/B 机构预发验收脚本已完成，结算和导出端到端预发验收仍需补充。
8. 预发执行 `npm run smoke:tenant:seed` 和 `npm run smoke:tenant`，确认 `deploy/tenant-smoke-result.json` 记录完整通过后，将配置标记逐项改为 `true`，最后打开 `MULTI_TENANT_ENABLED`。
