# 日志权限、脱敏与导出闭环验收报告

## 1. 验收范围

本报告对应持续开发计划 `11.01.32`，覆盖平台操作日志、商家操作日志、后台登录日志和 H5 验证码日志的查看、敏感字段、导出、租户范围、页面状态和移动布局。

验收页面：

- `/admin/operation-logs`
- `/admin/admin-login-logs`
- `/admin/h5-code-logs`

主要接口：

- `GET /admin/operation-logs`
- `GET /admin/operation-logs/options`
- `GET /admin/operation-logs/export`
- `GET /admin/auth/login-logs`
- `GET /admin/auth/h5-code-logs`
- `GET /admin/auth/log-options`
- `GET /admin/auth/login-logs/export`
- `GET /admin/auth/h5-code-logs/export`

## 2. 权限模型

| 权限 | 能力 |
|---|---|
| `logs.view` | 查看平台或当前商家的操作日志，敏感字段默认脱敏 |
| `logs.sensitive` | 查看操作日志完整 IP、User-Agent 和受控详情字段 |
| `logs.export` | 导出当前数据范围内最多 10000 条操作日志 XLSX |
| `security_log.view` | 查看平台后台登录日志和 H5 验证码日志 |
| `security_log.sensitive` | 查看完整 IP、User-Agent、手机号和服务商消息号 |
| `security_log.export` | 导出后台登录日志和 H5 验证码日志 XLSX |

敏感权限和导出权限分别自动包含对应查看权限，但互不包含。`security_log.*` 为平台专属权限，商家账号不能访问平台安全日志。

## 3. 本轮整改

- 操作日志、登录日志和验证码日志改用专属 options 接口，不再依赖商家管理权限读取筛选项。
- 普通操作日志响应脱敏 IP、隐藏 User-Agent，并递归处理详情中的手机号、IP、终端、身份证、银行账号、地址和经纬度。
- 后台登录日志普通响应脱敏 IP并隐藏 User-Agent。
- H5 验证码日志普通响应脱敏手机号和 IP，并隐藏服务商消息号。
- 三类 Excel 导出分别受独立导出权限控制，列表敏感权限不会隐式获得导出能力，导出权限也不会隐式获得敏感字段。
- 导出操作统一写入 `export.operation_logs`、`export.admin_login_logs`、`export.h5_code_logs` 审计。
- PC 页面按权限显示敏感说明、终端列和导出按钮，并补加载、导出错误反馈及操作互斥。
- 验证码手机号改为显式 `displayPhone` 安全渲染，通过后台隐私静态门禁。
- 修复 H5 验证码日志在 390×844 下卡片和筛选表单内部溢出。

## 4. 保留测试账号

密码均为 `Qiwai123456`。

| 账号 | 数据范围与权限 |
|---|---|
| `showcase_log_read` | 平台操作日志只读，`logs.view` |
| `showcase_log_sensitive` | 平台操作日志敏感查看，`logs.sensitive` |
| `showcase_log_export` | 平台操作日志脱敏导出，`logs.export` |
| `showcase_security_log_read` | 平台安全日志只读，`security_log.view` |
| `showcase_security_log_sensitive` | 平台安全日志敏感查看，`security_log.sensitive` |
| `showcase_security_log_export` | 平台安全日志脱敏导出，`security_log.export` |
| `showcase_staff_read` | 慢π演示中心操作日志只读，附加 `logs.view` |
| `showcase_staff_manager` | 慢π演示中心操作日志敏感查看，附加 `logs.sensitive` |
| `showcase_staff_security` | 慢π演示中心操作日志脱敏导出，附加 `logs.export` |

商家日志权限复用既有三账号，避免突破当前套餐 `adminUsers=30` 的真实额度。所有历史账号、日志、导出审计和测试数据均保留。

## 5. 真实 API 验收

执行命令：

```powershell
$env:SHOWCASE_PASSWORD='Qiwai123456'
npm run acceptance:log-permissions
```

最新结果：`.local-logs/log-permission-1784362687313/result.json`

| 场景 | 实际结果 |
|---|---|
| 平台操作日志只读 | 读取 9098 条；IP 脱敏、User-Agent 隐藏、导出 403 |
| 平台操作日志敏感 | 完整敏感投影成功，导出仍为 403 |
| 平台操作日志导出 | 列表保持脱敏，XLSX `634446` bytes |
| 商家操作日志范围 | options 仅返回商家 `#23`，读取 4274 条且全部属于当前商家 |
| 商家操作日志导出 | XLSX `254410` bytes，未泄露其他商家 |
| 平台安全日志只读 | 后台登录日志 2481 条、验证码日志 275 条，敏感字段均脱敏，导出 403 |
| 平台安全日志敏感 | 完整 IP、User-Agent、手机号和服务商消息号可见，导出 403 |
| 平台安全日志导出 | 登录日志 XLSX `84724` bytes，验证码日志 XLSX `18774` bytes，列表仍脱敏 |
| 作用域隔离 | 操作日志账号访问安全日志 403，安全日志账号访问操作日志 403，商家账号访问平台安全日志 403 |
| 导出审计 | `export.operation_logs #9100`、`export.admin_login_logs #9101`、`export.h5_code_logs #9102` |

证据目录同时保留四份可打开的 XLSX：

- `operation-logs.xlsx`
- `tenant-operation-logs.xlsx`
- `admin-login-logs.xlsx`
- `h5-code-logs.xlsx`

## 6. 应用内浏览器验收

- 操作日志只读账号显示脱敏提示，无浏览器列和导出按钮。
- 操作日志敏感账号显示完整 IP 与浏览器列，但无导出按钮。
- 操作日志导出账号保持脱敏并显示导出按钮。
- 后台登录日志三种账号分别形成只读、敏感、导出界面状态。
- H5 验证码日志只读账号手机号和 IP 脱敏，无服务商消息号和导出按钮；正式构建首行手机号为 `133****9731`。
- H5 验证码日志敏感账号显示完整手机号、IP 和服务商消息号；导出账号保持脱敏并显示导出按钮。
- 普通操作日志 `member.create` 详情显示 `139****0005`，页面中不存在完整 `13990000005`。
- 390×844 下文档和 body 为 `375/375`，页面为 `351/351`，卡片 `309/309`，筛选区 `277/277`，均无外层或内部横向溢出。
- 临时移动视口已恢复为默认桌面视口；本轮没有新增控制台 warning/error，日志中仅有更早时间戳的历史 Element Plus 警告。

## 7. 自动化与发布门禁

| 检查 | 结果 |
|---|---|
| 日志权限专项 | 4 文件、66 项通过 |
| API 全量测试 | 130 文件、712 项通过 |
| API 构建 | 通过 |
| PC 生产构建 | 通过，1946 个模块 |
| 完整演示 seed | 通过，既有数据保留 |
| API Docker | 仅重建 API，服务 healthy；MySQL 与数据卷未重建 |
| 权限目录 | 106 项，通过目录一致性门禁 |
| 完整 `npm run preflight` | 通过 |

预检仅保留既有上线提醒：正式短信环境变量尚未填写时，必须在系统设置中配置生产短信服务商凭证。该项不影响本轮日志权限功能验收。

## 8. 验收结论

`11.01.32` 已达到本批完成标准：六类权限边界、平台与商家作用域、列表投影、详情递归脱敏、三类导出审计、真实 XLSX、错误状态和移动布局均已闭环，没有遗留的本轮优化整改项。
