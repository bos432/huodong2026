# 后台账号管理权限分层验收报告

## 1. 验收范围

本报告对应持续开发计划 `11.01.31`，验证后台账号查看、账号维护、安全操作、员工邀请、角色复制、活动数据范围、平台委派和商家隔离形成闭环。

验收页面：`/admin/admins`

主要接口：

- `GET /admin/admins`
- `GET /admin/admins/options`
- `POST /admin/admins`
- `PATCH /admin/admins/:id`
- `POST /admin/admins/:id/password`
- `POST /admin/admins/:id/status`
- `POST /admin/admins/:id/force-logout`
- `POST /admin/admins/:id/copy-role`
- `GET/POST /admin/admin-invitations`
- `POST /admin/admin-invitations/:id/revoke`

## 2. 权限模型

| 权限 | 能力 |
|---|---|
| `admin.view` | 查看账号列表、账号权限、数据范围、商家选项、活动选项和邀请记录 |
| `admin.manage` | 创建账号、编辑角色/权限/所属商家/数据范围、创建和撤销邀请、复制角色 |
| `admin.security.manage` | 重置密码、启停账号、强制下线 |

`admin.manage` 和 `admin.security.manage` 分别自动包含 `admin.view`，但二者互不包含。三项权限均可分配给平台委派账号和商家后台账号，数据范围始终由服务端限定。

## 3. 本轮整改

- 将原单一 `admin.manage` 拆分为查看、维护和安全三类权限，路由、菜单、系统设置入口和页面按钮保持一致。
- 新增 `GET /admin/admins/options`，账号管理不再依赖 `tenant.view` 或 `activity.view` 获取商家及活动选项。
- 平台委派账号可查看全平台账号，但只能操作商家员工账号；不能创建、编辑、重置或停用平台账号，也不能设置超级管理员角色。
- 商家账号列表、详情和邀请严格限定当前商家；通过其他商家 ID 请求返回 404，options 只返回本商家。
- 编辑接口只有在启用状态实际变化时才额外校验 `admin.security.manage`，阻止维护账号通过 `PATCH` 夹带停用。
- 角色复制只允许同一商家范围，避免跨商家复制活动数据范围。
- 创建、编辑和邀请时校验活动 ID 全部属于目标商家；平台账号不能设置商家活动范围。
- 账号列表中的商家对象裁剪为 `id/code/name/region/enabled`，不再因 `admin.view` 携带商家完整设置。
- PC 页面提供只读、账号维护、账号安全三种明确状态；维护弹窗无安全权限时只显示状态标签，不提交 `enabled`。
- 平台委派账号使用平台范围布局，能正常筛选商家；非超级管理员必须选择商家，只能选择运营、财务或签到角色。

## 4. 保留测试账号与数据

密码均为 `Qiwai123456`。

| 账号 | 范围与权限 |
|---|---|
| `showcase_admin_read` | 平台，`admin.view` |
| `showcase_admin_manager` | 平台，`admin.manage` |
| `showcase_admin_security` | 平台，`admin.security.manage` |
| `showcase_staff_read` | 慢π演示中心，`admin.view` |
| `showcase_staff_manager` | 慢π演示中心，`admin.manage` |
| `showcase_staff_security` | 慢π演示中心，`admin.security.manage` |

保留专项账号：

- `#220 admin_perm_1784359849906`，财务角色，指定活动 `#185`。
- `#221 admin_perm_1784359899454`，财务角色，指定活动 `#185`。
- `#222 admin_perm_1784359955758`，运营角色，只读账号权限，最终启用。
- 撤销邀请 `#1/#2`，均保留在邀请记录中。

## 5. 真实 API 验收

执行命令：

```powershell
$env:SHOWCASE_PASSWORD='Qiwai123456'
npm run acceptance:admin-account-permissions
```

最新结果：`.local-logs/admin-account-permission-1784359954776/result.json`

| 场景 | 实际结果 |
|---|---|
| 平台只读 | 查看 100 条当前分页账号和邀请记录成功；创建和重置密码 403 |
| 平台维护 | 创建商家员工 `#222`、编辑角色权限、创建/撤销邀请成功；安全接口 403 |
| 夹带停用 | 维护账号通过编辑接口发送 `enabled=false` 返回 403 |
| 委派提权 | 创建平台账号、设置超级管理员角色、操作平台账号均返回 403 |
| 活动范围 | 其他商家活动 ID 写入目标账号返回 400 |
| 角色复制 | 跨商家复制角色权限返回 400 |
| 商家只读 | 仅返回当前商家 28 个账号；猜测其他商家 options 仍只返回商家 `#23` |
| 跨租户 ID | 商家维护账号编辑其他商家账号返回 404 |
| 安全操作 | 密码重置、强制下线、停用、启用和恢复密码全部成功 |
| 会话失效 | 强制下线后的旧 token 返回 401；停用账号登录返回 401 |

审计记录：

- `admin.create`：`#8627`
- `admin.update`：`#8631`
- `admin.password.reset`：`#8636`
- `admin.force_logout`：`#8633`
- `admin.disable/admin.enable`：`#8634/#8635`
- `admin.invitation.create/revoke`：`#8629/#8630`

## 6. 应用内浏览器验收

- `showcase_admin_read`：菜单可进入商家账号，只显示列表、筛选和“邀请记录”；创建卡片、操作列和写按钮均不存在。邀请弹窗只显示记录，无创建表单和撤销按钮。
- `showcase_admin_manager`：显示创建、邀请、编辑和复制角色；重置密码、启停和强制下线均不存在。编辑 `#222` 时状态为只读标签，安全开关数量为 0；角色选项不含超级管理员。
- `showcase_admin_security`：显示重置密码、禁用和强制下线，不显示创建、编辑或复制角色。点击禁用后取消，账号仍为启用且三个按钮恢复可用。
- 390x844 下只读/安全页面 `document 375/375`、页面 `351/351`、表格卡片 `309/309`；维护页面创建卡片 `309/309`、权限面板 `275/275`，外层无横向溢出。
- 已恢复默认视口，浏览器停留 `/admin/admins?tenantId=23`，当前登录 `showcase_admin_manager`。
- 当前批次未产生新的 warning/error；日志中仅有早于本批的 Element Plus 单选兼容提醒。

## 7. 自动化与门禁

- 权限专项：4 文件、65 项通过。
- API 全量：129 文件、706 项通过。
- API 构建：通过。
- PC 生产构建：1946 模块通过。
- 完整 seed：通过，原数据保留。
- 真实 API 专项：通过。
- 完整 preflight：通过。
- 管理员权限目录：101 项通过。
- API Docker：已重建并 healthy；MySQL 和数据卷未重建。

完整 preflight 仅保留正式短信环境变量可由系统设置提供的既有提醒。

## 8. 结论

`11.01.31` 已完成。后台账号管理已实现查看、账号维护和安全操作三权分离，平台委派和商家账号均可在自身边界内完成工作，服务端阻止编辑夹带停用、平台账号提权、跨租户 ID 猜测、跨商家角色复制和错误活动数据范围。
