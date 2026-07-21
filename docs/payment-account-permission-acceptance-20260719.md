# 收款账户权限、隐私与并发治理验收报告

## 1. 验收结论

本报告对应持续开发计划 `11.01.42`。代理与收款账户已完成查看、维护、敏感三类权限分层，并完成专属 options、服务端分页筛选、最小字段投影、手机号与商户号脱敏、递归密钥脱敏、星号占位保留、租户与商家边界、同代理同渠道启用账户并发防重和 PC 响应式闭环。

验收结论：通过。数据库治理 migration 已执行，专项数据和演示账号均保留。

## 2. 权限模型

| 权限 | 能力 |
|---|---|
| `payment_account.view` | 查看代理、收款账户、配置字段摘要和专属 options |
| `payment_account.manage` | 新增、编辑代理与收款账户 |
| `payment_account.sensitive` | 查看完整联系人手机号、商户号和脱敏后的配置对象 |

- 维护和敏感权限分别自动包含查看权限，二者互不包含。
- 只读账号不能新增或编辑，配置仅返回 `configKeys/configuredKeyCount`。
- 维护账号可写普通字段，但手机号、商户号及配置密钥仍保持脱敏。
- 敏感只读账号可查看完整手机号和商户号，但没有写入口。
- API、PC 权限目录、路由、菜单、默认角色和线上展示 seed 已同步，权限目录共 131 项。

## 3. API 与数据边界

- 新增 `GET /admin/payment-accounts/options`，返回当前范围内的最小商家、代理和支付渠道选项。
- 代理与账户列表支持服务端分页、关键词、渠道、启停、商家和代理筛选。
- tenant、agent、parentAgent 统一使用白名单 DTO，不返回 settings、支付配置或其他完整关联实体。
- 普通查看和维护账号的联系人手机号、商户号由服务端脱敏；PC 使用权限感知 `displayPhone` 再保护。
- 代理禁止跨商家迁移；账户禁止更换代理或支付渠道；跨租户和跨商家对象返回 404。
- DTO 对 ID、分页、关键词、名称、地区、联系人、手机号、商户号、渠道和配置对象执行边界校验。

## 4. 密钥保留与隐私

- API V3 Key、openid、apiKey、身份字段和嵌套密钥递归返回 `***`，不在列表接口输出明文。
- 更新时递归识别 `***`，自动保留数据库原值，避免星号覆盖真实配置。
- 无敏感权限维护普通字段时，服务端保留原手机号和商户号。
- 只读账号只看到配置键名和数量，不接收配置值。
- 预检首次发现 PC 代理列表直接渲染 `contactPhone`，已改为权限感知的公共隐私 helper；全局隐私门禁复测通过。

## 5. 并发与数据库治理

- 同一代理、同一支付渠道只能有一个启用账户。
- 创建启用账户时使用 MySQL `GET_LOCK`，事务内再次执行锁定读和重复检查。
- 首版生成列唯一索引方案因旧外键表重建不兼容而在事务中完整回滚，未影响现有数据。
- 最终 migration 停用历史重复启用行，并新增 `IDX_agent_payment_accounts_agent_provider` 普通索引；并发唯一性由命名锁与事务共同保证。
- migration `1783860000000-AgentPaymentAccountGovernance` 已真实执行。
- 迁移前备份：`backups/mysql/activity_registration-20260718-235649.sql.gz`，约 1.58 MB。

## 6. 保留账号与数据

账号密码均为 `Qiwai123456`：

| 账号 | 用途 |
|---|---|
| `showcase_payment_account_read` | 只读、配置摘要与隐私脱敏验收 |
| `showcase_payment_account_manager` | 代理和收款账户维护、星号保留验收 |
| `showcase_payacct_sensitive` | 完整手机号、商户号和敏感只读验收 |
| `admin` | 平台范围、跨商家边界和审计验收 |

最新真实 API 证据：`.local-logs/payment-account-permission-1784392467631/result.json`。

| 对象 | 保留数据 |
|---|---|
| 商家 | `#23` |
| 代理 | `#47` |
| 收款账户 | `#16` |
| 并发代理 | `#48` |
| 并发创建成功账户 | `#15` |
| 跨租户边界代理 | `#49` |
| 敏感审计 | 最新审计集合包含 `#11571/#11572` |

## 7. 真实 API 验收

| 场景 | 结果 |
|---|---|
| 三类权限矩阵 | 通过，越权写入被拒绝 |
| 专属 options 与最小字段投影 | 通过 |
| 只读手机号、商户号 | `139****5678`、`MCH4****7631` |
| 敏感手机号、商户号 | `13912345678`、`MCH4392467631` |
| API V3 Key、openid、嵌套 apiKey 更新后保留 | 全部为 true |
| 跨商家迁移与跨租户访问 | 被拒绝 |
| 同代理同渠道并发创建 | `201/400` |

## 8. 应用内浏览器验收

证据：`.local-logs/payment-account-permission-1784391097414/browser/result.json`。

- 只读账号无新增、编辑入口，手机号和商户号脱敏，配置只显示摘要。
- 维护账号有新增、编辑入口，手机号和商户号仍脱敏；编辑窗口不显示商户号输入，JSON 中密钥、openid 和嵌套 apiKey 均为 `***`。
- 敏感账号无写入口，手机号和商户号完整显示。
- 390×844 下页面无横向溢出；编辑支付账户窗口 `left=0/right=390/clientWidth=390/scrollWidth=390`。
- 恢复桌面视口后 body `clientWidth=999/scrollWidth=999`，浏览器控制台 error 为 0。
- 截图位于 `.local-logs/payment-account-permission-1784391097414/browser/`。

## 9. 自动化与发布门禁

| 检查 | 结果 |
|---|---|
| 收款账户限定测试 | 6 文件，150 项通过 |
| API 全量测试 | 140 文件，776 项通过 |
| Shared/API/PC/H5 构建 | 通过 |
| PC 构建 | 1946 模块 |
| 微信小程序构建 | 通过 |
| 线上展示 seed | 通过，原数据和专项数据保留 |
| 权限目录一致性 | 131 项通过 |
| 完整 `npm run preflight` | 通过 |
| migration 状态 | 179 个实际 migration 全部 `[X]`；最新历史序号为 180，序号 172 空缺 |
| Docker | API、MySQL healthy，Nginx running，ready=true |
| 浏览器控制台 | error 0 |

预检仅保留正式短信凭证未配置提醒；ready 还列出生产密钥、正式域名、对象存储、HSTS 和正式通道等上线前配置项，这些属于全项目生产环境配置，不是本工作包功能缺陷。

## 10. 复测命令

```powershell
$env:SHOWCASE_PASSWORD='Qiwai123456'
$env:API_BASE='http://127.0.0.1:18080/api'
npm run acceptance:payment-account-permissions
npm run seed:online-showcase
npm test
npm run build
npm run build:mobile:mp-weixin
npm run preflight
npm --prefix apps/api run migration:show
docker compose -p activity-registration ps
```
