# 课程收益、学员下钻与讲师本人范围验收报告

日期：2026-07-19  
工作包：`11.01.50`  
状态：已完成本批。

## 1. 本批目标

- 建立讲师档案与后台账号一对一绑定。
- 让讲师账号只能访问本人课程及关联业务数据。
- 保持课程订单查看与通用活动订单、财务操作相互隔离。
- 修复课程页依赖通用会员等级权限导致整页 403 的问题。
- 完成课程级收益、学员、完课、证书和退款下钻。
- 建立独立课程导出权限，并验证讲师本人课程导出和跨课程拒绝。
- 完成真实 API、数据库、桌面浏览器和 390px 移动布局验收。

## 2. 实现结果

### 2.1 账号绑定与数据库约束

- `course_teachers.adminUserId` 绑定后台账号。
- 同一后台账号最多绑定一个讲师档案，数据库唯一索引负责最终并发保护。
- 绑定后台账号与讲师档案必须属于同一商家。
- 删除后台账号时绑定关系按外键策略处理，迁移可回滚。
- migration：`apps/api/src/migrations/1783930000000-CourseTeacherAdminScope.ts`。

### 2.2 权限模型

- `course.teacher_scope`：仅本人讲师课程范围。
- `course_order.view`：查看课程订单。
- `course_order.manage`：确认课程线下收款。
- `course.teacher_scope` 继承 `course.manage + course_order.view`，不继承通用 `order.view`、`member.view` 或 `course_order.manage`。
- 通用 `order.view/manage` 继续兼容课程订单查看和管理，现有运营、财务角色不受影响。

### 2.3 服务端数据范围

讲师范围同时作用于：

- 课程列表、总览、详情、新增、更新和删除。
- 章节、课时和私有课程资源上传。
- 课程资源访问日志。
- 考核、题目、提交、批改、补考授权和成绩导出。
- 课程订单、评价、答疑、公告、证书模板和学习提醒。
- 课程退款查询仍单独要求 `order.refund`，讲师账号不会因 `course.manage` 获得退款权限。

集合查询使用绑定讲师子查询；详情及写接口再次验证课程讲师。账号未绑定启用讲师档案时明确拒绝，不回退到全商家数据。

### 2.4 课程会员等级选项

新增：

`GET /api/admin/course-member-level-options`

规则：

- 路由权限为 `course.manage`。
- 商家账号只返回本商家课程可使用的会员等级。
- 平台账号指定 `tenantId` 时只返回该商家，未指定时返回各作用域供课程编辑器切换。
- 响应仅包含 `id`、`name`、`sortOrder`、`tenantId`。
- PC 课程页不再请求 `/admin/member-levels`，因此不需要给讲师授予 `member.view`。

### 2.5 课程经营与学习下钻

新增：

- `GET /api/admin/courses/:id/insights`
- `GET /api/admin/courses/:id/learners`
- `GET /api/admin/courses/:id/insights/export`

实现结果：

- 收益统一使用整数分，返回订单数、有效支付数、完成退款数、毛额、退款和有符号净额。
- 学习指标返回学员数、已开始、已完课、完课率、平均进度、有效证书和撤销证书。
- 学员明细支持关键词、学习状态、排序和服务端分页，并返回订单、退款、净额、证书及学习时间。
- 手机号在服务端脱敏，PC 端再次调用统一脱敏函数形成纵深保护。
- Excel 包含“课程汇总”和“学员明细”两个工作表，超过 10000 人明确拒绝导出。
- 新增 `course.export`，普通 `course.manage` 不自动获得导出权限；`course.teacher_scope` 仅允许导出本人课程。
- 课程经营导出和考核成绩导出统一受 `course.export` 控制。

## 3. 保留验收数据

| 项目 | 值 |
| --- | --- |
| 后台账号 | `showcase_course_teacher` |
| 密码 | `Qiwai123456` |
| 后台账号 ID | `267` |
| 讲师档案 | `#1 慢π保留测试讲师` |
| 绑定课程 | `#3 【演示】国学入门十分钟` |
| 可见课程 | 仅 `#3` |
| 可见课程订单 | 41 张 |
| 课程等级选项 | 8 条 |
| 可导出账号 | `showcase_course_export / Qiwai123456`，账号 `#268` |
| 无导出账号 | `showcase_course_no_export / Qiwai123456`，账号 `#269` |
| 讲师范围专项 | `.local-logs/course-teacher-scope-1784432598632/result.json` |
| 课程数据专项 | `.local-logs/course-insights-1784432609868/result.json` |

测试数据按交付要求保留。

## 4. API 权限验收

| 场景 | 结果 |
| --- | --- |
| 本人课程列表 | 200，仅课程 `#3` |
| 本人讲师档案 | 200，仅讲师 `#1` |
| 课程等级最小选项 | 200，8 条，字段投影正确 |
| 课程订单 | 200，41 张，全部属于本人课程 |
| 考核、评价、答疑、公告、资源日志 | 200，均未逃逸本人课程范围 |
| 跨讲师课程详情 | 404 |
| 跨讲师课程更新 | 404 |
| 通用活动订单 | 403 |
| 通用会员等级 | 403 |
| 确认课程线下收款 | 403 |
| 敏感后台账号字段 | 未返回 |
| 课程 `#8` 经营汇总 | 200，与 MySQL 直接查询一致 |
| 课程 `#8` 学员明细 | 200，共 21 人，手机号全部脱敏 |
| 课程 `#8` Excel | 200，9893 bytes，两个工作表，21 行学员明细 |
| 讲师本人课程 Excel | 200，11657 bytes |
| 讲师跨课程汇总、学员、导出 | 404 / 404 / 404 |
| 普通课程管理账号经营导出 | 403 |
| 普通课程管理账号考核成绩导出 | 403 |

课程 `#8` 数据库对账：

- 订单 22，全部为有效支付订单，完成退款 1。
- 毛额 `657800` 分、退款 `29900` 分、净额 `627900` 分。
- 学员 21，全部已开始，当前均为学习中，平均进度 `17.5%`。
- 有效证书 0，撤销证书 1。

## 5. 浏览器验收

地址：`http://127.0.0.1:18080/admin/courses`

桌面结果：

- 左侧菜单只有“扩展 · 专题共修 / 课程管理”。
- 课程总览显示已发布 1、草稿 0、课程订单 41。
- 课程表仅显示课程 `#3`。
- 课程订单区域存在，页面无确认收款按钮。
- 控制台 warning/error 为 0。

390x844 结果：

- 页面 `document.scrollWidth <= viewportWidth`，无页面级横向溢出。
- “讲师资料”弹窗标题准确，只显示本人档案。
- 弹窗内无“新增讲师”和“删除”按钮。
- 控制台 warning/error 为 0。

课程数据弹窗结果：

- 讲师账号只显示课程 `#3`，课程数据下钻共 42 位学员，导出按钮可见。
- 无导出账号可查看课程 `#8` 的经营与学员数据，但经营导出和考核成绩导出按钮均不存在。
- 桌面和 390x844 页面均无页面级横向溢出，学员手机号保持脱敏。
- 两个账号控制台 warning/error 均为 0。

截图：

- `.local-logs/course-teacher-scope-1784430351949/browser-desktop-courses.png`
- `.local-logs/course-teacher-scope-1784430351949/browser-mobile-teacher-profile.png`
- `.local-logs/course-insights-1784432609868/browser-desktop-course-insights.png`
- `.local-logs/course-insights-1784432609868/browser-mobile-course-insights.png`
- `.local-logs/course-insights-1784432609868/browser-desktop-no-export.png`
- `.local-logs/course-insights-1784432609868/browser-mobile-no-export.png`

## 6. Migration 验收

- 升级前备份：`backups/mysql/activity_registration-20260719-103637.sql.gz`。
- 隔离库：`activity_registration_course_teacher_test`。
- 已执行 migration `up/down/up`。
- 主库 migration 已执行。
- `npm --prefix apps/api run migration:show` 显示 187 个实际 migration 全部 `[X]`。

## 7. 自动化与构建

- 课程范围和权限专项：2 文件，38 项通过。
- 课程权限与范围专项：3 文件，61 项通过。
- API 全量：147 文件，842 项通过。
- Shared 构建：通过。
- API 构建：通过。
- PC 构建：1946 模块，通过。
- H5 构建：通过。
- 微信小程序构建：通过。
- 完整 `npm run preflight`：通过。
- `git diff --check`：通过，仅有历史行尾提示。
- Docker：API、MySQL healthy。
- Readiness：`ready=true`、`blockingCount=0`。

## 8. 环境待办

本地 readiness 仍报告 15 项上线前配置 warning，主要是正式加密密钥、检索哈希密钥、志愿签到密钥、生产数据库密码、域名、CORS、对象存储、HSTS、严格 DTO、H5 登录和支付沙箱配置；另有短信、邮件、微信消息和两个自动任务等 5 项可选 warning。它们不阻塞本地功能验收，但正式上线前必须按生产部署清单配置并复验。

## 9. 本批结论

课程收益、学员、完课、证书、退款下钻和权限化导出已经形成完整闭环。讲师账号只在本人课程范围内操作，普通课程管理账号不能越权导出，财务金额、学员数量和导出行数均与数据库一致。本工作包没有遗留的本地开发项；正式上线前配置继续按生产部署清单验收。
