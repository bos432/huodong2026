# 活动分类与票种权限闭环验收报告

## 1. 验收范围

本报告对应持续开发计划 `11.01.33`，覆盖活动分类、票种、活动编辑元数据的查看/维护权限、平台与商家边界、数据范围、响应投影、操作审计和移动布局。

验收页面：

- `/admin/categories`
- `/admin/ticket-types`
- `/admin/activities`

主要接口：

- `GET/POST /admin/categories`
- `PATCH /admin/categories/:id`
- `POST /admin/categories/:id/disable`
- `GET/POST /admin/ticket-types`
- `GET /admin/ticket-types/options`
- `PATCH /admin/ticket-types/:id`
- `GET /admin/activities/options`

## 2. 权限模型

| 权限 | 能力 |
|---|---|
| `category.view` | 查看平台全局分类或当前商家的活动分类 |
| `category.manage` | 新增、编辑、启停分类，自动包含 `category.view` |
| `ticket.view` | 查看当前商家数据范围内的票种和活动选项 |
| `ticket.manage` | 新增、编辑票种，自动包含 `ticket.view` |
| `activity.manage` | 创建、编辑活动，自动包含 `activity.view`；通过专属 options 获取编辑元数据 |

查看和维护权限分别映射到 GET 与写接口。票种页面不再要求 `activity.view`，活动编辑也不再要求代理账户、会员管理或商家管理权限。

## 3. 本轮整改

- 新增 `category.view`、`ticket.view`，分类和票种管理权限改为 read-first 权限模型。
- PC 路由、菜单、最小权限回退和前端权限目录同步新增两项权限，避免登录后权限被过滤。
- 分类页和票种页形成真实只读状态：新增、编辑、启停、上传和写弹窗均隐藏，写函数保留二次判权。
- 新增 `GET /admin/ticket-types/options`，只返回当前商家及活动数据范围内的 `id/title/status/tenant` 最小活动选项。
- 新增 `GET /admin/activities/options`，一次返回分类、代理、会员等级和商家最小编辑元数据，不再串行依赖其他模块权限。
- 分类响应只返回分类字段和最小商家对象；票种响应中的活动仅保留 `id/title/status`，商家对象不含 settings、联系人或电话。
- 平台编辑活动时，分类和代理选项按所选商家过滤；服务端拒绝把其他商家的分类或代理关联到活动。
- 分类新增、更新、停用和票种新增、更新写入统一操作审计。
- 分类和票种页面补齐 390×844 容器、筛选表单和表格内部滚动约束。

## 4. 验收中发现并修复的问题

### 4.1 平台全局分类 ID 越权

首轮真实专项使用商家维护账号直接更新平台全局分类 `#26` 时返回 200。根因是通用租户断言把 `tenant=null` 视为可访问，随后更新逻辑又把该分类改归当前商家。

现分类编辑和停用增加严格归属断言：商家账号只能操作 `category.tenant.id === 当前 tenantId` 的分类，平台全局分类和其他商家分类均返回 404。

按用户要求，修复前产生的分类 `#26 / cross-tenant` 和失败证据目录 `.local-logs/category-ticket-permission-1784364886785` 保留，不删除测试数据。

### 4.2 前端权限目录遗漏

后端首次加入 `category.view/ticket.view` 后，浏览器登录请求虽然返回 201，但 PC 静态权限目录会过滤未知权限，最小分类账号仍被送回登录页。

现前后端权限目录统一为 108 项，并由权限目录 preflight guard 与源码契约测试固定。

## 5. 保留测试账号与数据

密码均为 `Qiwai123456`。

| 账号 | 用途 |
|---|---|
| `showcase_category_read` | 平台分类只读，`category.view` |
| `showcase_category_manager` | 平台分类维护，`category.manage` |
| `showcase_staff_read` | 商家分类/票种只读，附加 `category.view/ticket.view` |
| `showcase_staff_manager` | 商家分类/票种维护，附加 `category.manage/ticket.manage` |
| `showcase_staff_security` | 活动维护 options 验收，附加 `activity.manage`，不具备代理、会员或商家列表权限 |

最终专项保留：

- 平台分类 `#27 / 平台分类验收-category-ticket-permission-1784365061211-已更新`
- 商家分类 `#28 / 商家分类验收-category-ticket-permission-1784365061211-已更新`
- 票种 `#58 / 票种权限验收-category-ticket-permission-1784365061211-已更新`
- 修复前越权测试分类 `#26 / cross-tenant`

## 6. 真实 API 验收

执行命令：

```powershell
$env:SHOWCASE_PASSWORD='Qiwai123456'
npm run acceptance:category-ticket-permissions
```

最新结果：`.local-logs/category-ticket-permission-1784365061211/result.json`

| 场景 | 实际结果 |
|---|---|
| 平台分类只读 | 读取 26 条；创建 403；商家关系不含 settings/联系电话 |
| 平台分类维护 | 创建 `#27`、更新成功，保持平台全局归属 |
| 商家分类只读 | 只返回商家 `#23` 的 5 条分类；创建 403 |
| 分类 ID 越权 | 商家维护账号更新平台分类返回 404 |
| 商家分类维护 | 创建 `#28` 并更新成功，归属商家 `#23` |
| 票种只读 | 获得 44 个当前范围活动选项；票种创建 403 |
| 票种维护 | 创建并更新票种 `#58`，活动和商家归属正确 |
| 跨商家活动 | 使用其他商家活动创建票种返回 404 |
| 活动编辑 options | 返回分类 6、代理 31、会员等级 25、商家 1；商家设置仅含 `registrationReviewEnabled` |
| 最小活动维护边界 | 直接读取代理、会员等级和商家列表均为 403，但活动 options 正常 |
| 操作审计 | `category.create #9293`、`category.update #9294`、`ticket_type.create #9295`、`ticket_type.update #9296` |

## 7. 应用内浏览器验收

- `showcase_category_read` 自动落地平台分类页，只显示全局分类菜单；28 行分类，新建和编辑按钮均为 0。
- `showcase_category_manager` 显示 1 个新增按钮和 28 个编辑按钮；打开新增弹窗后取消，弹窗关闭且无接口副作用。
- `showcase_staff_read` 商家分类页显示 6 行，只读提示可见，写按钮为 0；票种页显示 13 行，无活动加载错误，新建和编辑按钮为 0。
- `showcase_staff_manager` 票种页显示 1 个新建按钮和 13 个编辑按钮；新增弹窗取消后关闭，无写入。
- `showcase_staff_security` 可进入活动管理、显示新建活动；打开编辑向导后分类、所属代理、会员门槛字段均存在，未出现 options 加载错误。
- 390×844 下分类页文档 `375/375`、页面 `351/351`、卡片 `309/309`；票种页卡片 `309/309`、筛选表单 `277/277`，均无外层横向溢出。
- 默认视口已恢复为 `999/999`；本轮页面没有新增 warning/error，控制台仅保留更早时间戳的历史 Element Plus 警告。

## 8. 自动化与发布门禁

| 检查 | 结果 |
|---|---|
| 权限专项 | 4 文件、67 项通过 |
| API 全量测试 | 131 文件、717 项通过 |
| API 构建 | 通过 |
| PC 生产构建 | 通过，1946 个模块 |
| 完整演示 seed | 通过，账号与既有数据保留 |
| 真实 API 专项 | 通过 |
| 权限目录 | 108 项，前后端一致 |
| 完整 `npm run preflight` | 通过 |
| API Docker | healthy；MySQL 和数据卷未重建 |
| `git diff --check` | 通过 |

预检仅保留既有上线提醒：正式短信环境变量尚未填写时，必须在系统设置中配置生产短信服务商凭证。

## 9. 验收结论

`11.01.33` 已达到本批完成标准：分类和票种查看/维护分层、活动编辑专属 options、严格租户边界、最小响应投影、审计和移动布局均已形成闭环，本轮发现的越权和前端权限过滤问题已完成整改和回归。
