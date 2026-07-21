# 营销弹窗权限、租户边界与统计治理验收报告

## 1. 验收结论

本批完成持续开发计划 `11.01.40`。营销弹窗已从单一维护权限升级为查看/维护分层，并完成后台最小响应、SQL 筛选分页、严格服务端校验、事务并发保护、公共事件统计边界和 PC/H5/微信小程序契约闭环。

验收结论：通过。本批无数据库 migration，正式短信、微信、支付等外部凭证不影响该功能完成判定。

## 2. 完成范围

### 2.1 权限与入口

- 新增 `marketing_popup.view`。
- `marketing_popup.manage` 自动继承查看权限。
- GET 列表、options 和生效检测使用查看权限。
- POST、PATCH、DELETE 使用维护权限。
- PC 路由、平台菜单、商家菜单和默认角色同步使用查看权限作为最低入口。
- 只读页面保留筛选、生效检测和数据查看，隐藏新增、编辑、启停、删除及上传动作。
- 图片上传继续独立要求 `upload.image`。

### 2.2 API 与数据边界

- 新增 `GET /admin/marketing-popups/options`，只返回当前范围内的最小商家、启用会员等级、类型、平台、页面和频次枚举。
- 列表支持 `tenantId/keyword/enabled/platform/placement/page/pageSize`。
- 平台和页面筛选在 MySQL `JSON_CONTAINS` 中执行，不再先截断 300 条后内存过滤。
- 列表响应统一返回分页元数据和白名单字段。
- 商家对象仅返回 `id/code/name/enabled`，不返回配置、联系人、备注和时间等内部字段。

### 2.3 输入与业务校验

- 标题、副标题、正文、重点文案、图片地址、按钮文案/链接、时间和分页均按实体或页面约束校验。
- 类型、平台、页面、频次、按钮样式和受众模式使用白名单。
- 图片只允许 HTTPS 或 `/uploads/`。
- 小程序投放拒绝普通 HTTP(S) 外链和 `//` 协议相对地址。
- 指定会员等级受众必须至少选择一个存在且启用的等级。
- 未知受众模式、畸形成员等级和非法枚举返回 400，不再静默回退为默认值。

### 2.4 并发、审计与统计

- 更新和删除在事务内使用 `pessimistic_write` 行锁。
- 锁后重新执行租户边界和套餐可写校验。
- 更新审计记录前后快照，正文仅保存长度与 SHA-256。
- 公共事件接口要求 `event/pageKey/platform`，并结合请求租户和可选登录会员校验：
  - 商家归属；
  - 启停和排期；
  - 投放平台和页面；
  - 游客、登录会员和会员等级受众。
- 通过校验后在行锁事务内增加曝光、点击或关闭计数。

### 2.5 PC 与移动端

- PC 使用专属 options，不再请求完整商家和会员等级模块接口。
- PC 增加分页、只读状态、上传权限控制和移动端单列布局。
- 编辑抽屉使用 `min(980px, 100vw)`，390px 视口下宽度精确为 390px。
- 浏览器验收发现并修复“单按钮弹窗打开编辑时自动补出第二个按钮”的隐式写入缺陷；修复后按钮值保持为 `查看详情 / 空`。
- H5 和微信小程序事件上报同步发送当前 `pageKey/platform`。

## 3. 保留账号与数据

账号密码均为 `Qiwai123456`：

| 账号 | 权限用途 |
|---|---|
| `showcase_staff_read` | 营销弹窗只读、生效检测 |
| `showcase_staff_manager` | 营销弹窗维护、图片上传 |

保留数据：

| 对象 | 编号 | 说明 |
|---|---:|---|
| 正式保留弹窗 | `#8` | 商家 `#23`，会员等级 `#1`，曝光 1、点击 0 |
| 首轮中断保留弹窗 | `#7` | 商家 `#23`，用于保留首轮统计边界测试数据 |
| 其他商家边界弹窗 | `#10` | 商家 `#31`，用于跨商家写入和事件边界复核 |
| 创建审计 | `#10868` | `marketing_popup.create` |
| 更新审计 | `#10871` | `marketing_popup.update` |
| 删除审计 | `#10873` | `marketing_popup.delete` |

## 4. 真实 API 验收

证据：`.local-logs/marketing-popup-permission-1784383277724/result.json`

| 场景 | 结果 |
|---|---|
| 只读账号获取列表/options/生效检测 | 通过 |
| 只读账号创建、更新、删除 | 403 |
| 非法分页、状态、平台、类型、图片、按钮、受众 | 400 |
| 专属 options 最小商家投影 | 通过 |
| keyword + enabled + platform + placement SQL 筛选 | `total=1` |
| 正确曝光事件 | 201，曝光 `0 -> 1` |
| 错误页面点击事件 | ignored，点击不变 |
| 其他商家点击事件 | ignored，点击不变 |
| 并发更新 | `200/200` |
| 更新/删除竞争 | `404/200` |
| 跨商家更新、删除 | 404 |
| 创建、更新、删除审计 | 完整 |

## 5. 应用内浏览器验收

证据：`.local-logs/marketing-popup-permission-1784383277724/browser/result.json`

- 只读账号可进入营销弹窗页，写按钮为 0，生效检测命中保留弹窗。
- 维护账号显示新增、编辑、启停、删除和上传入口。
- 编辑抽屉正确读取会员等级、平台、页面、频次和按钮。
- 删除确认选择取消后，弹窗仍存在且操作锁恢复。
- 关键词筛选仅保留目标数据，页面显示 `Total 1`。
- 390×844：页面 `scrollWidth=375 <= 390`，抽屉 `left=0/right=390/width=390`。
- 浏览器控制台 error 为 0。

截图：

- `.local-logs/marketing-popup-permission-1784383277724/browser/read-only.png`
- `.local-logs/marketing-popup-permission-1784383277724/browser/manager.png`
- `.local-logs/marketing-popup-permission-1784383277724/browser/manager-390x844.png`

## 6. 自动化、构建与发布门禁

| 检查 | 结果 |
|---|---|
| 营销弹窗相关限定测试 | 6 文件，90 项通过 |
| API 全量测试 | 138 文件，760 项通过 |
| API 构建 | 通过 |
| PC 构建 | 通过，1946 模块 |
| H5 构建 | 通过 |
| 微信小程序构建 | 通过 |
| 权限目录一致性 | 126 项通过 |
| 完整 `npm run preflight` | 通过 |
| migration 状态 | 178 个实际 migration 全部 `[X]` |
| Docker | API、MySQL healthy，Nginx running |
| `git diff --check` | 通过，仅既有换行提示 |

预检仍提示生产短信凭证未填写，以及健康检查中的生产密钥、域名、对象存储等上线前配置项。这些属于全项目正式环境配置，不是营销弹窗功能缺陷。

## 7. 复测命令

```powershell
$env:SHOWCASE_PASSWORD='Qiwai123456'
$env:SHOWCASE_ADMIN_PASSWORD='Qiwai123456'
npm run acceptance:marketing-popup-permissions
npm --prefix apps/api run test
npm run build:admin
npm run build:mobile:h5
npm run build:mobile:mp-weixin
npm run preflight
```
