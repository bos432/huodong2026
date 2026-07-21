# 通知中心权限、隐私与发送治理验收报告

## 1. 验收范围

本报告对应持续开发计划 `11.01.38`，覆盖通知模板、发送记录、通知预览、单会员发送、活动提醒、标签分群发送、计划提醒、通知偏好、服务商状态、失败补偿、频控、敏感变量、岗位活动数据范围、跨商家边界、操作审计和 PC 移动布局。

验收页面：

- `/admin/notifications`

主要接口：

- `GET /admin/notifications/options`
- `GET/POST/PATCH /admin/notification-templates`
- `GET /admin/notifications`
- `POST /admin/notifications/preview`
- `POST /admin/notifications/send`
- `POST /admin/notifications/send-by-tag`
- `POST /admin/notifications/:id/retry`
- `POST /admin/activities/:id/reminders/send`
- `GET/PATCH /admin/notification-preferences`
- `GET/POST/PATCH /admin/notification-schedules`
- `POST /admin/notification-schedules/run-due`
- `GET /admin/notification-providers`

## 2. 权限模型

| 权限 | 能力 |
|---|---|
| `notification.view` | 查看当前商家和岗位范围内的模板、规则、偏好、服务商状态及脱敏发送记录；允许脱敏预览 |
| `notification.template.manage` | 创建和维护本商家通知模板、活动提醒规则；自动包含查看权限 |
| `notification.send` | 单会员、活动、标签分群发送，执行到期规则和失败重试；自动包含查看权限 |
| `notification.preference.manage` | 维护当前商家会员的渠道订阅偏好；自动包含查看权限 |
| `notification.sensitive` | 查看完整手机号、签到码、服务商消息号和失败详情；自动包含查看权限，不包含写权限 |
| `notification.manage` | 兼容旧角色，组合查看、模板、发送和偏好维护，不包含敏感权限 |

模板维护、发送、偏好维护和敏感查看可独立分配。维护账号不会因业务操作权限自动获得完整手机号、签到码或服务商错误详情。

## 3. 本轮发现并修复的问题

### 3.1 活动提醒路由误用活动维护权限

`POST /admin/activities/:id/reminders/send` 原先被通用 `activities/*` 规则提前匹配为 `activity.manage`，导致拥有通知发送权限但没有活动维护权限的账号无法发送提醒。现将活动提醒映射提前到通用活动规则之前，明确要求 `notification.send`。

### 3.2 租户无法创建通知模板

新建模板时，空实体被错误执行“已有模板归属”校验，租户维护账号创建模板返回 404。现仅在更新已有模板时执行严格归属检查；新建模板先绑定当前商家，跨商家更新仍返回 404。

### 3.3 无活动通知的补偿任务归属错误

失败通知发布业务补偿任务时只读取活动租户，无活动站内信会落入平台任务域。现优先使用通知自身租户，并在异步处理时校验任务租户与通知租户一致，避免跨租户异步补偿。

### 3.4 频控存在并发穿透窗口

原发送频控采用“统计后插入”，同一会员并发请求可能同时通过 10 分钟 5 次限制。现创建通知前对目标会员执行数据库悲观写锁，在同一事务内检查偏好、统计频次并写入发送或抑制记录。真实专项连续 6 次发送得到 5 次 `sent`、第 6 次 `suppressed/rate-limit`。

### 3.5 后台重试与异步补偿可能重复投递

后台重试已有行锁，但快速失败写回后，第二个并发请求仍可能再次抢到失败状态；异步任务也可能与后台重试竞争。现后台与业务任务都只从 `failed` 状态抢占，事务内改为 `pending`，增加短重试冷却窗口，并清理旧错误时间。真实并发重试仅一次受理，结果为 `201/400`。

### 3.6 通知正文和变量敏感信息边界

通知列表、即时发送响应和预览统一使用白名单 DTO。普通账号：

- 手机号服务端脱敏；
- 签到码仅保留首尾两位；
- 标题和正文中的 11 位手机号统一替换；
- `providerMessageId` 和 `errorMessage` 固定返回 `null`；
- 不返回 openid、unionid、wechatAppId、密码和登录身份字段。

只有 `notification.sensitive` 可获得完整变量、服务商消息号和失败详情。

## 4. 保留账号与测试数据

密码均为 `Qiwai123456`。

| 账号 | 用途 |
|---|---|
| `showcase_business_job_readonly` | `business_job.view + notification.view`，无活动和标签权限，用于独立 options 验收 |
| `showcase_staff_read` | 通知只读，会员和服务商信息脱敏 |
| `showcase_staff_manager` | 模板、发送、偏好和规则维护，敏感信息脱敏 |
| `showcase_staff_security` | 通知敏感查看，无写权限 |
| `qiwai_hz_admin` | 杭州商家边界数据创建和跨商家 404 验收 |

最新专项：`.local-logs/notification-permission-1784378065761/result.json`

保留数据：

- 商家 `#23`
- 活动 `#186`
- 会员 `#31069/#31070/#31071`
- 通知模板 `#15`
- 已发送通知 `#334`
- 通知偏好 `#3`
- 退订抑制通知 `#335`
- 并发重试失败通知 `#342`
- 杭州边界会员 `#31072`
- 杭州模板/规则/通知 `#16/#11/#343`
- 操作审计 `#10373/#10374/#10375/#10385/#10388`

## 5. 真实 API 验收

执行命令：

```powershell
$env:PLATFORM_ADMIN_USERNAME='admin'
$env:PLATFORM_ADMIN_PASSWORD='Admin123456'
$env:SHOWCASE_PASSWORD='Qiwai123456'
$env:SHOWCASE_ADMIN_PASSWORD='Qiwai123456'
$env:QIWAI_DEMO_PASSWORD='Qiwai123456'
npm run acceptance:notification-permissions
```

| 场景 | 实际结果 |
|---|---|
| 独立 options | 仅通知查看账号获得 45 个活动和 6 个标签；直接读取活动、标签模块均 403 |
| 分页边界 | 通知 `pageSize=101`、偏好 `page=0` 均返回 400 |
| 权限矩阵 | 只读和敏感账号写操作 403；维护账号可创建模板、发送、维护偏好 |
| 单发目标 | 未提供 `userId` 返回 400 |
| 变量隐私 | 普通预览手机号和签到码脱敏；敏感预览返回完整值 |
| 列表隐私 | 普通账号无完整手机号、消息号和错误详情；敏感账号完整可见 |
| 退订 | 会员退订后发送记录为 `suppressed/preference` |
| 频控 | 前 5 条 `sent`，第 6 条 `suppressed/rate-limit` |
| 并发重试 | 同一失败通知两次并发请求为 `201/400`，仅一次受理 |
| 跨商家模板 | 更新杭州模板返回 404 |
| 跨商家规则 | 更新杭州提醒规则返回 404 |
| 跨商家通知 | 重试杭州通知返回 404 |
| 跨商家偏好 | 修改杭州会员偏好返回 404 |
| 操作审计 | 模板、发送、偏好、重试和规则创建审计全部存在 |

## 6. 应用内浏览器验收

浏览器证据：`.local-logs/notification-permission-1784378065761/browser/result.json`

截图：

- `browser/read-only.png`
- `browser/manager.png`
- `browser/manager-390x844.png`
- `browser/sensitive.png`

验收结果：

- 只读账号无新增模板、发送和保存偏好按钮，显示只读提示；完整手机号 `13988065762` 不存在，脱敏值 `139****5762` 可见。
- 维护账号显示新增模板、提醒规则、发送、偏好和失败重试入口；完整手机号与服务商消息号不可见。
- 对失败通知打开重试确认后点击取消，重试次数和整行内容保持不变，无接口副作用。
- 敏感账号显示完整手机号 `13988065762`、服务商消息号和 `Mock provider forced failure`，但无模板、发送或偏好写按钮。
- 390×844 下浏览器内容宽度为 `375/375`，页面 `351/351`，三个表格容器均 `277/277`，无页面横向溢出。
- 当前页面控制台 error 数为 0。

## 7. 自动化与发布门禁

| 检查 | 结果 |
|---|---|
| 通知限定测试 | 5 文件、76 项通过 |
| API 全量测试 | 136 文件、296 suites、744 项通过 |
| API 构建 | 通过 |
| PC 生产构建 | 通过，1946 个模块 |
| 完整杭州/线上展示 seed | 通过，原数据保留 |
| 真实 API 专项 | 通过 |
| 权限目录 | 124 项，前后端一致 |
| 完整 `npm run preflight` | 通过 |
| migration | 178 个实际文件全部 `[X]`，待执行 0；最大历史序号 179，序号 172 空缺 |
| API/MySQL Docker | healthy |
| `git diff --check` | 通过，仅有既有 LF/CRLF 提示 |

本批没有数据库结构变更。预检仅保留正式渠道提醒：短信、微信和 SMTP 凭证必须在生产环境变量或系统设置中配置后再做真实触达验收。本地 `publish:webroot` 显示 API `BUILD_COMMIT` 元数据为 `-`；正式发布制品必须注入版本提交号。

## 8. 验收结论

`11.01.38` 已达到本批完成标准：通知查看、模板、发送、偏好和敏感五类能力完成独立授权；专属 options、分页、最小投影、变量脱敏、岗位范围、并发频控、失败重试、异步租户隔离、跨商家 404、操作审计和移动布局均形成闭环。
