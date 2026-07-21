# 商家管理权限分层与多端验收报告

## 1. 验收范围

本报告对应持续开发计划 `11.01.30`，验证平台商家管理在查看、资料维护、权益维护、套餐生命周期、导出、敏感信息、租户隔离、移动管理端和操作状态方面形成闭环。

验收页面：

- PC：`/admin/tenants`
- 移动管理端：`/#/pages/admin/login`、`/#/pages/admin/home`

主要接口：

- `GET /admin/tenants`
- `POST /admin/tenants`
- `PATCH /admin/tenants/:id`
- `POST /admin/tenants/:id/permissions`
- `GET /admin/tenants/:id/subscription-events`
- `POST /admin/tenants/:id/subscription-change`
- `GET /admin/tenants/export`
- `GET /admin/mobile/bootstrap`
- `GET /admin/dashboard`

## 2. 权限模型

| 权限 | 能力 |
|---|---|
| `tenant.view` | 查看商家列表、详情、套餐历史和移动端可选商家 |
| `tenant.manage` | 新建商家、维护资料、联系人、状态和备注 |
| `tenant.permissions.manage` | 维护活动审核、报名审核、收款配置、商城和自定义权益 |
| `tenant.subscription.manage` | 续费、升级、降级、延期、暂停和恢复套餐 |
| `tenant.export` | 导出包含完整联系电话的商家 Excel |

继承与作用域：

- 后四项分别自动包含 `tenant.view`。
- 五项均为平台专属，租户账号强制剔除。
- 资料、权益、套餐和导出互不自动包含。
- 路由、菜单、PC 页面和移动 bootstrap 均按真实权限控制。

## 3. 本轮整改

### 3.1 服务端边界

- 商家列表默认使用安全投影；没有 `tenant.manage` 的账号只获得脱敏电话并返回 `sensitiveMasked=true`。
- Excel 导出显式读取完整数据，避免页面查看权限间接获得敏感信息。
- 修复资料管理员可通过 `TenantDto.settings` 夹带修改权益和套餐的问题；服务端按操作者权限筛选允许写入的设置键。
- 权益 DTO 和权益服务不再接受 `packagePlan/packageExpiresAt`，套餐只能通过生命周期接口变更。
- 修复商家 `remark` 未持久化的问题。
- 续费和延期的新到期日必须晚于当前到期日，阻止无变化事件污染套餐历史。
- 移动 bootstrap 调用商家列表时显式使用 `tenant.view` 上下文，避免被当前 `activity.view` 路由权限二次拒绝。
- 移动 bootstrap 仅在具备 `payment_account.view` 时加载代理/收款列表，避免无关模块同步抛错导致登录回跳。
- 平台委派 `dashboard.view` 和 `payment_account.view/manage` 账号可通过对应服务层断言，不再被错误限制为超级管理员。

### 3.2 PC 页面

- 新建、编辑、权益开关、套餐表单和导出按钮分别按五类权限显示或禁用。
- 资料管理员编辑弹窗不显示套餐与权益字段，提交载荷也不会携带未授权设置。
- 权益接口只提交明确权益字段，不再发送整份商家 settings。
- 批量启停发送完整资料载荷，兼容现有更新 DTO 校验。
- 套餐历史增加独立 loading、持久错误、重试和确认互斥。
- 跨模块入口按后台账号、收款、活动审核、报名、财务和日志权限分别显示。
- 联系电话在列表和详情继续前端脱敏，避免管理页面肩窥泄露。

## 4. 保留测试账号

密码均为 `Qiwai123456`。

| 账号 | 权限与用途 |
|---|---|
| `showcase_tenant_read` | `dashboard.view + activity.view + tenant.view`，PC/移动只读 |
| `showcase_tenant_manager` | `tenant.manage`，资料创建和更新 |
| `showcase_tenant_rights` | `tenant.permissions.manage`，商家权益维护 |
| `showcase_tenant_plan` | `tenant.subscription.manage`，套餐生命周期维护 |
| `showcase_tenant_export` | `tenant.export`，Excel 导出 |

完整 seed 已重跑，原活动、课程、社区、商城、账号和余额数据均保留。

## 5. 真实 API 验收

执行命令：

```powershell
$env:SHOWCASE_PASSWORD='Qiwai123456'
npm run acceptance:tenant-permissions
```

最新结果：`.local-logs/tenant-permission-1784357852536/result.json`

保留专项商家：

- `#59 / permission_tenant_1784357853367`
- 名称：`商家权限验收-1784357853367-资料已更新`
- 电话：`13800138000`
- 最终套餐：`city_partner`
- 到期日：`2030-12-31`

| 场景 | 实际结果 |
|---|---|
| 只读账号 | 电话 `138****8000`，全部写操作与导出 403 |
| 资料管理员 | 创建、更新和备注持久化成功；夹带权益/套餐被忽略；权益、套餐和导出 403 |
| 权益管理员 | 报名审核开启、商城关闭成功；资料、套餐和导出 403 |
| 套餐管理员 | 升级事件 `#4` 成功；相同到期日续费返回 400；资料、权益和导出 403 |
| 导出管理员 | 获得有效 XLSX，`14696` bytes；列表电话仍脱敏；其他写操作 403 |
| 租户账号 | 访问平台商家列表返回 403 |
| 移动 bootstrap | 返回 45 个可选商家、`canSelectTenant=true`，电话保持脱敏 |
| 平台经营概览 | 只读委派账号返回 `scope=platform` |

审计证据：

- `tenant.create`：`#8456`
- `tenant.permissions.update`：`#8458`
- `tenant.subscription.upgrade`：`#8459`
- `export.tenants`：`#8460`

## 6. 应用内浏览器验收

### 6.1 只读账号

- 自动落地 `/admin/tenants`。
- 导出、新建和编辑按钮均为 0。
- 商家 `#57` 电话显示为 `138****8000`。
- 四个权益开关全部禁用，详情可查看但不可修改。

### 6.2 资料管理员

- 显示新建和编辑，不显示导出。
- 编辑商家 `#57` 时仅显示编码、名称、地区、联系人、联系电话、启用状态和备注。
- “商家套餐”和四项权益字段均为 0，证明页面不会引导越权提交。

### 6.3 权益管理员

- 不显示新建、编辑、导出和套餐写操作。
- 详情页四项权益开关可操作。
- 浏览器关闭商家 `#57` 的商城授权后，列表和详情立即回显“未开通”，审计 `#8140` 保留。

### 6.4 套餐管理员

- 权益开关全部禁用，仅显示续费、升级、降级、暂停和恢复。
- 套餐历史正确展示升级记录。
- 浏览器在规则修复前产生一条相同日期续费测试记录，审计 `#8141` 保留；随后服务端已整改，相同到期日专项复测固定返回 400。

### 6.5 导出管理员

- 仅显示导出按钮，不显示新建、编辑和权益/套餐写操作。
- 嵌入式浏览器未产生 Blob 下载事件；真实 API 已验证 XLSX 文件、字节数和导出审计，因此记录为浏览器能力限制，不视为功能失败。

### 6.6 移动端

- PC 后台 390x844 检查中，文档与页面外壳无横向溢出，内容宽度 `375/375`。
- 移动管理端使用 `showcase_tenant_read` 登录成功，进入 `/#/pages/admin/home`。
- 页面显示平台活动总数 185、报名累计 10536，并明确提示“当前账号可查看活动，但没有手机端创建和编辑权限”。
- 移动首页 `scrollWidth=clientWidth=390`，无外层横向溢出。
- 移动 bootstrap 返回可选商家列表且所有联系电话脱敏。
- 最终已恢复默认浏览器视口，并停留在 `/admin/tenants`，当前登录 `showcase_tenant_export`。

## 7. 自动化、构建与发布门禁

- 权限专项：5 文件、90 项通过。
- API 全量：128 文件、700 项通过。
- API 构建：通过。
- PC 生产构建：1946 模块通过。
- 真实 API 专项：通过。
- 完整 seed：通过。
- 完整 preflight：通过。
- 管理员权限目录：99 项通过。
- API Docker：已重建并 healthy，MySQL 与数据卷未重建。
- `git diff --check`：通过，仅有既有 CRLF 提示。

完整 preflight 仍仅提示正式短信环境变量可由系统设置提供。该提醒属于生产外部凭据配置，与本工作包无关。

## 8. 结论

`11.01.30` 已完成。商家管理已实现查看、资料、权益、套餐和导出五类权限分层，服务端阻止夹带越权，PC 与移动端形成只读和写操作闭环，真实 XLSX、审计、租户隔离、无效续费拦截及全量发布门禁均通过。
