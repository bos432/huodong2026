# 公告中心权限、租户边界与并发治理验收报告

## 1. 验收范围

本报告对应持续开发计划 `11.01.39`，覆盖公告查看与维护权限、租户归属、会员等级受众、输入校验、分页筛选、最小字段投影、更新删除并发、操作审计、PC 只读状态、移动布局和旧 V1 同路径旁路清理。

验收页面：`/admin/announcements`

主要接口：

- `GET /admin/announcements/options`
- `GET /admin/announcements`
- `POST /admin/announcements`
- `PATCH /admin/announcements/:id`
- `DELETE /admin/announcements/:id`

## 2. 权限模型

| 权限 | 能力 |
|---|---|
| `announcement.view` | 查看当前商家公告，使用专属 options、组合筛选和分页 |
| `announcement.manage` | 新增、编辑、启停、置顶和删除公告；自动包含查看权限 |
| `upload.image` | 在编辑器上传图片；未授权时仍可维护文本和安全图片 URL |

API、PC 路由、平台/商家菜单、权限目录、默认角色和线上展示 seed 已同步。只读账号可以独立进入公告中心，不再借用 `tenant.view` 或 `member.view`。

## 3. 本轮发现并修复的问题

### 3.1 查看必须借用维护权限

原 GET、写接口、路由和菜单全部要求 `announcement.manage`，页面内部 `canWrite=true`。现拆为 `announcement.view/manage`，写按钮、上传入口和只读提示按实际权限显示。

### 3.2 options 借用商家和会员模块

原页面直接请求 `/admin/tenants` 与 `/admin/member-levels`。现新增专属 options，只返回当前范围内的最小商家、启用会员等级和允许公告类型。

### 3.3 列表返回完整租户实体

原列表使用 `leftJoinAndSelect` 并直接返回实体，可能暴露租户联系人、电话、设置和备注。现显式选择公告字段及 `tenant.id/code/name/enabled`，统一通过白名单 DTO 返回。

### 3.4 无分页和输入边界

现支持 `keyword/type/enabled/tenantId/page/pageSize`，每页限制 1-100；标题 120、内容 50000、日期字符串 40，类型限定为 `notice/guide/activity/operation`，兼容现有演示数据。

### 3.5 会员等级受众可保存无效数据

`member_levels` 现在必须至少选择一个启用等级；不存在或停用 ID 返回 400，其他受众模式会清理无关等级 ID。

### 3.6 更新和删除缺少并发串行化

更新和删除现在在事务内对公告行执行 `pessimistic_write`，锁后复核租户、套餐写状态、日期和受众。更新审计保存前后快照，正文只记录长度和 SHA-256，不复制正文原文。

### 3.7 存在同路径旧 V1 写入口

AdminModule 与 V1Module 同时注册，旧 V1 控制器仍声明同路径公告 GET/POST/PATCH。现移除重复路由及死写方法，后台公告只保留 AdminService 一套受治理入口；公开公告读取和受众过滤保持不变。

## 4. 保留账号与测试数据

密码均为 `Qiwai123456`。

| 账号 | 用途 |
|---|---|
| `showcase_staff_read` | 公告只读浏览器与 API 验收 |
| `showcase_staff_manager` | 新增、编辑、并发和删除取消验收 |
| `admin` | 平台 options、跨商家边界和审计验收 |

真实 API 证据：`.local-logs/announcement-permission-1784380017014/result.json`

保留数据：商家 `#23`、会员等级 `#1`、专项公告 `#48`、其他商家边界公告 `#50`、操作审计 `#10578/#10580/#10582`。

## 5. 真实 API 验收

```powershell
$env:SHOWCASE_PASSWORD='Qiwai123456'
$env:SHOWCASE_ADMIN_PASSWORD='Qiwai123456'
npm run seed:online-showcase
npm run acceptance:announcement-permissions
```

| 场景 | 实际结果 |
|---|---|
| 专属 options | 只读账号只获得当前商家、25 个启用会员等级和 4 个类型 |
| 分页及枚举 | 非法 pageSize、状态和类型均返回 400 |
| 权限矩阵 | 只读账号 POST/PATCH/DELETE 均 403 |
| 字段边界 | 超长标题、未知类型、空等级和不存在等级均 400 |
| 最小投影 | 商家对象只有 `id/code/name/enabled` |
| 组合筛选 | 关键词、operation 类型和启用状态命中 1 条 |
| 并发更新 | 两次 PATCH 为 `200/200`，事务串行完成，无混合字段或 500 |
| 更新/删除竞争 | 并发 PATCH/DELETE 为 `404/200`，最终公告不存在 |
| 跨商家边界 | 更新、删除其他商家公告均 404 |
| 操作审计 | 创建、更新、删除审计均存在 |

## 6. 应用内浏览器验收

浏览器证据：`.local-logs/announcement-permission-1784380017014/browser/result.json`

截图：`read-only.png`、`manager.png`、`manager-390x844.png`。

- 只读账号显示只读提示，专项筛选总数为 1；新增、编辑按钮数量均为 0。
- 维护账号显示完整写入口；没有 `upload.image` 时上传按钮正确隐藏。
- 对公告 `#48` 打开删除确认后取消，列表仍为 1 条，无接口副作用。
- 默认视口页面宽度 `1014/1014`，无文档级横向溢出。
- 390×844 下列表页面 `375/375`；表格容器 `277`，内部表格 `1240`，仅容器受控横向滚动。
- 移动端编辑抽屉宽度 `390/390`，标题和会员等级受众正确回填。
- 页面控制台 error 数为 0。

## 7. 自动化与发布门禁

| 检查 | 结果 |
|---|---|
| 公告限定测试 | 4 文件、80 项通过 |
| API 全量测试 | 137 文件、751 项通过 |
| API 构建 | 通过 |
| PC 生产构建 | 通过，1946 个模块 |
| 线上展示 seed | 通过，原数据保留 |
| 真实 API 专项 | 通过 |
| 权限目录 | 前后端均 125 项 |
| migration | 178 个实际文件全部 `[X]`，待执行 0 |
| 完整 `npm run preflight` | 通过，仅保留正式短信凭证配置提醒 |
| API/MySQL Docker | healthy，最新镜像查询专项公告总数 1、ID `#48` |
| `git diff --check` | 通过，仅有既有 LF/CRLF 提示 |

本批没有数据库结构变更，也没有短信、微信、支付或 SMTP 等外部凭证依赖。

## 8. 验收结论

`11.01.39` 已达到本批完成标准：公告查看与维护完成独立授权；专属 options、分页筛选、输入边界、会员等级受众、最小租户投影、事务并发、跨商家 404、操作审计、只读页面、上传权限和移动抽屉形成闭环；旧 V1 同路径写旁路已清理。
