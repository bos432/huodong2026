# 代理结算权限、隐私与资金并发治理验收报告

## 1. 验收结论

本报告对应持续开发计划 `11.01.43`。代理结算已完成查看、维护、登记打款、自动转账、敏感查看和导出六权分层，并完成专属 options、服务端分页筛选、详情与回执白名单投影、敏感审计、周期生成和状态操作并发保护、服务端 Excel 导出以及 PC 六角色闭环。

验收结论：通过。最新真实 API 数据、浏览器截图和专项账号均保留；本工作包没有新增 migration，现有 179 个 migration 已全部执行。

## 2. 权限模型

| 权限 | 能力 |
|---|---|
| `agent_settlement.view` | 查看结算列表、详情、最小选项和能力评估 |
| `agent_settlement.manage` | 生成、提交、审核和拒绝结算 |
| `agent_settlement.pay` | 登记手工打款 |
| `agent_settlement.transfer` | 发起沙箱/真实自动转账和扫描回执 |
| `agent_settlement.sensitive` | 查看完整流水号、凭证、失败原因和服务商回执 |
| `agent_settlement.export` | 导出当前权限范围内的结算明细 |

- 五类操作权限分别自动包含查看权限，彼此互不包含。
- API、PC 权限目录、路由、菜单、默认角色和线上展示 seed 已同步，权限目录共 132 项。
- 最小结算账号登录后可直接进入 `/agent-settlements`，不会因缺少其他模块权限被送回登录页。

## 3. API、查询与导出

- 新增 `GET /admin/agent-settlements/options`，只返回当前商家范围内的最小商家、代理、状态和周期选项。
- 列表支持关键词、状态、代理、商家、周期、page 和 pageSize 服务端筛选，返回 `{ items, total, page, pageSize, summary }`。
- 导出使用独立查询，最多 10000 条，不受当前页面分页截断影响。
- tenant、agent、account、transfer、audit 和关联业务对象统一使用白名单 DTO，不返回完整租户 settings、账户配置、订单对象或内部 payload。
- DTO 对状态枚举、ID、页大小、关键词、周期、渠道、备注、流水号和模拟结果执行边界校验。

## 4. 隐私与审计

- 无敏感权限时，打款人、流水号和商户号脱敏，凭证、备注、服务商回执和失败原因隐藏或替换为受控提示。
- 敏感账号可查看完整流水号、凭证、服务商回执和失败原因，但仍不能读取内部 payload、账户密钥或完整租户配置。
- 自动转账响应通过 `publicAgentSettlementTransferResult` 返回白名单字段，成功与未成功分支分别显式返回 `markedPaid=true/false`。
- 敏感详情访问记录审计；最新专项审计集合包含 `#12216/#12217`。

## 5. 状态机与资金并发

- 同一代理和周期生成结算使用 MySQL `GET_LOCK`、事务和代理/结算行锁，锁后重新检查重复周期。
- 提交、审核、拒绝和登记打款使用同一结算命名锁及事务行锁，审核意见和拒绝原因必须填写。
- 手工打款必须填写流水号或上传凭证，防止无依据标记已支付。
- 回执扫描使用全局命名锁，避免多实例重复查询和重复推进状态。
- 自动转账只有成功结果才能把结算标记为 paid；处理中、失败和未实现结果保持未打款状态。
- 真实并发结果：周期生成 `201/400`，审核通过/拒绝竞争 `201/400`，并发登记打款 `201/400`。

## 6. 保留账号与数据

账号密码均为 `Qiwai123456`：

| 账号 | 用途 |
|---|---|
| `showcase_settle_read` | 结算只读与脱敏验收 |
| `showcase_settle_manager` | 生成、提交、审核和拒绝验收 |
| `showcase_settle_pay` | 手工登记打款验收 |
| `showcase_settle_transfer` | 自动转账和回执扫描验收 |
| `showcase_settle_sensitive` | 完整回执和失败原因只读验收 |
| `showcase_settle_export` | 独立导出权限验收 |
| `admin` | 平台范围和跨商家边界验收 |

最新真实 API 证据：`.local-logs/agent-settlement-permission-1784396030124/result.json`。

| 对象 | 保留数据 |
|---|---|
| 商家 | `#23` |
| 代理 | `#52` |
| 周期生成结算 | `#26` |
| 敏感详情结算 | `#27` |
| 自动转账 | `#2` |
| 手工打款结算 | `#28` |
| 跨租户代理/结算 | `#53/#29` |

## 7. 真实 API 验收

| 场景 | 结果 |
|---|---|
| 六类权限矩阵 | 通过，越权接口返回 403 |
| 非法分页和状态参数 | 返回 400 |
| 跨商家结算详情 | 返回 404 |
| 只读流水号和凭证 | `BANK****0124`、`null` |
| 敏感流水号和服务商回执 | `BANK-1784396030124`、`WX-1784396030124` |
| 内部 payload 泄露 | false |
| 三组资金并发 | 均为 `201/400` |
| Excel 导出 | 200，XLSX Content-Type 正确 |

## 8. 应用内浏览器验收

证据：`.local-logs/agent-settlement-permission-1784394708885/browser/result.json`。

- 六个最小权限账号分别只显示所属按钮；查看、维护、打款、转账、敏感和导出边界全部通过。
- 只读、维护、打款和导出账号只看到脱敏流水；敏感账号显示完整回执和失败原因，但页面中不存在内部 payload。
- 转账账号可见扫描与沙箱操作，其他账号不显示转账入口。
- 390x844 下页面和详情抽屉均无横向溢出，抽屉 `clientWidth=390/scrollWidth=390`。
- 恢复桌面视口后 body `clientWidth=999/scrollWidth=999`，浏览器控制台 error 为 0。
- 截图位于 `.local-logs/agent-settlement-permission-1784394708885/browser/`。

## 9. 自动化与发布门禁

| 检查 | 结果 |
|---|---|
| 代理结算限定测试 | 5 文件，139 项通过 |
| API 全量测试 | 141 文件，784 项通过 |
| Shared/API/PC/H5 构建 | 通过 |
| PC 构建 | 1946 模块 |
| 微信小程序构建 | 通过 |
| 线上展示 seed | 通过，原数据和专项数据保留 |
| 权限目录一致性 | 132 项通过 |
| 完整 `npm run preflight` | 通过 |
| migration 状态 | 179 个文件、数据库 179 条记录，全部执行 |
| Docker | API、MySQL healthy，Nginx running，ready=true |
| `git diff --check` | 通过 |

预检仅保留正式短信凭证提醒；ready 中的生产密钥、正式域名、对象存储、HSTS 和外部通道为全项目上线前配置项，不属于本工作包功能缺陷。

## 10. 复测命令

```powershell
$env:SHOWCASE_PASSWORD='Qiwai123456'
$env:API_BASE='http://127.0.0.1:18080/api'
npm run acceptance:agent-settlement-permissions
npm run seed:online-showcase
npm test
npm run build
npm run build:mobile:mp-weixin
npm run preflight
docker compose -p activity-registration ps
```
