# 广告中心权限、隐私与资金并发治理验收报告

## 1. 验收结论

本报告对应持续开发计划 `11.01.41`。广告中心已完成查看、维护、财务、敏感资料和导出五类权限分层，并完成专属 options、分页筛选、严格输入校验、最小字段投影、服务端脱敏、事务并发保护、结算状态机、官方收益防重、服务端 Excel 导出和 PC 响应式闭环。

验收结论：通过。本批无数据库 migration，正式支付、短信、微信等外部凭证不影响广告中心本批完成判定。

## 2. 权限模型

| 权限 | 能力 |
|---|---|
| `ad_center.view` | 查看广告主、合同、投放、结算、数据报表和专属 options |
| `ad_center.manage` | 新增、编辑、启停和删除广告主、合同、投放 |
| `ad_center.finance` | 生成结算、推进结算状态、导入微信官方广告收益 |
| `ad_center.sensitive` | 查看完整手机号、微信、资质、附件和备注 |
| `ad_center.export` | 导出投放计划和结算对账 Excel |

- 维护、财务、敏感和导出权限均自动包含最低查看权限。
- 运营默认具备完整广告中心权限。
- 财务默认具备查看、财务和导出权限，不能维护广告主、合同和投放。
- `showcase_staff_manager` 具备维护、敏感和导出权限，不能操作结算。
- `showcase_staff_read` 仅具备查看权限。
- API、PC 路由、平台/商家菜单、权限目录、默认角色和线上展示 seed 已同步。

## 3. API 与数据边界

- 新增 `GET /admin/ad-center/options`，仅返回当前范围内的最小商家、启用会员等级、广告主、合同和受控枚举。
- 商家对象只返回 `id/code/name/enabled`；options 可额外返回单个 `defaultAdImageUrl`，不返回完整 settings。
- 广告主、合同、投放和结算列表统一返回 `{ items, total, page, pageSize }`。
- 列表支持关键词、状态、来源、广告位、页面、平台、商家和分页等组合筛选。
- ID、分页、字符串长度、金额、优先级、状态、来源、形式、广告位、页面、平台、频次和受众均执行严格 DTO 校验。
- 图片和附件仅允许 HTTPS 或 `/uploads/`；小程序自有广告拒绝普通 HTTPS 外链。
- 微信官方广告仅允许 `mp-weixin`，并强制校验官方形式与广告类型映射。
- 指定会员等级受众必须引用存在且启用的等级。

## 4. 隐私与审计

- 普通查看和财务账号的手机号、微信号由服务端脱敏。
- 无敏感权限时，广告主资质、合同附件和备注不返回。
- 敏感账号可查看完整资料，敏感列表访问记录 `ad.sensitive.view` 审计。
- 无敏感权限账号编辑普通字段时，服务端保留原有敏感字段，避免误清空。
- 投放和结算导出均在服务端生成，最多 10000 条，复用租户范围并记录 `export.ad_campaigns`、`export.ad_settlements` 审计。

## 5. 并发与资金状态

- 广告主、合同和投放更新/删除均在事务内使用 `pessimistic_write`。
- 结算主单和明细同事务保存，并锁定合同。
- 同合同、同周期、非作废结算禁止重复。
- 结算状态机为 `pending -> confirmed -> invoiced -> paid`；`pending/confirmed/invoiced` 可作废，`paid/voided` 不允许回退，同状态请求幂等。
- 微信官方广告收益使用 MySQL `GET_LOCK`，锁保持到事务提交后释放，并使用当前锁定读复核重复数据。
- 首轮真实并发曾发现一致性快照导致结算与官方收益均出现 `201/201`；修复后稳定为 `201/400`，错误重复数据已纠正并保留回归证据。

并发缺陷证据：`.local-logs/ad-center-concurrency-regression-20260718.json`。

## 6. 保留账号与数据

账号密码均为 `Qiwai123456`：

| 账号 | 用途 |
|---|---|
| `showcase_staff_read` | 广告中心只读与脱敏验收 |
| `showcase_staff_manager` | 广告主、合同、投放维护及敏感资料验收 |
| `showcase_finance` | 结算、官方收益和导出验收 |
| `admin` | 平台范围、跨商家边界和审计验收 |

最新真实 API 证据：`.local-logs/ad-center-permission-1784388183370/result.json`。

| 对象 | 保留数据 |
|---|---|
| 商家 | `#23` |
| 广告主 | `#7` |
| 合同 | `#10` |
| 投放计划 | `#13` |
| 结算单 | `#8`，`AD20260718152304BAD1A01A` |
| 官方收益 | `#5`，导入日期 `2026-08-26` |
| 跨商家边界广告主 | `#8` |

## 7. 真实 API 验收

| 场景 | 结果 |
|---|---|
| 五类权限矩阵 | 通过，越权写入和导出均为 403 |
| 专属 options 与最小商家投影 | 通过 |
| 非法分页、枚举、金额、图片、官方广告组合和受众 | 400 |
| 只读手机号、微信和附件 | `139****5678`、微信脱敏、附件隐藏 |
| 财务手机号 | `139****5678` |
| 跨商家写入 | 404 |
| 结算并发 | `201/400` |
| 官方收益并发 | `201/400` |
| 投放 Excel 导出 | 200 |
| 结算 Excel 导出 | 200 |

## 8. 应用内浏览器验收

证据：`.local-logs/ad-center-permission-1784387253418/browser/result.json`。

- 只读账号无新增、编辑、删除和导出入口，手机号与微信保持脱敏。
- 维护账号可维护广告主、合同和投放，并可查看完整敏感资料；无结算生成和状态动作。
- 财务账号可生成结算、导出和推进状态；无广告主、合同和投放编辑入口。
- 敏感账号编辑抽屉正确显示完整手机号、微信、资质和备注。
- 390×844 下页面 `scrollWidth=375`，无文档级横向溢出；抽屉宽度和滚动宽度均为 390px。
- 浏览器控制台 error 为 0。

截图位于 `.local-logs/ad-center-permission-1784387253418/browser/`。

## 9. 自动化与发布门禁

| 检查 | 结果 |
|---|---|
| 广告中心限定测试 | 5 文件，109 项通过 |
| API 全量测试 | 139 文件，767 项通过 |
| Shared/API/PC/H5 构建 | 通过 |
| PC 构建 | 1946 模块 |
| 微信小程序构建 | 通过 |
| 线上展示 seed | 通过，原数据和专项数据保留 |
| 权限目录一致性 | 130 项通过 |
| 完整 `npm run preflight` | 通过 |
| migration 状态 | 178 个实际 migration 全部 `[X]` |
| Docker | API、MySQL healthy，Nginx running，ready=true |
| 浏览器控制台 | error 0 |

预检仍提示生产短信凭证未填写；健康检查还列出生产密钥、域名、对象存储、HSTS 和正式通道等上线前配置项。这些属于全项目生产环境配置，不是广告中心本批功能缺陷。

## 10. 复测命令

```powershell
$env:SHOWCASE_PASSWORD='Qiwai123456'
$env:SHOWCASE_ADMIN_PASSWORD='Qiwai123456'
npm run acceptance:ad-center-permissions
npm test
npm run build
npm run build:mobile:mp-weixin
npm run preflight
npm --prefix apps/api run migration:show
docker compose -p activity-registration ps
```
