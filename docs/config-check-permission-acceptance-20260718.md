# 独立上线体检权限与错误恢复验收报告

## 1. 验收范围

- 独立 `/admin/config-check` 页面的查看权限。
- 平台只读系统账号与商家账号的作用域边界。
- 加载失败的持久提示、独立重试和重复请求互斥。
- PC 桌面与 390×844 移动视口。

## 2. 权限结论

上线体检接口是只读 `GET /admin/system/config-check`，不修改服务器配置，因此页面路由和平台菜单统一使用 `system.view`。`system.manage` 自动包含 `system.view`；商家账号即使拥有 `operation_settings.view/manage`，仍不能进入平台页面或读取平台体检接口。

操作日志和配置中心的既有权限没有放宽：操作日志继续要求 `logs.view`，平台配置读取使用 `system.view`，商家配置读取使用 `operation_settings.view`。

## 3. 保留测试账号

| 账号 | 密码 | 作用域 | 权限 |
|---|---|---|---|
| `showcase_system_settings_read` | `Qiwai123456` | 平台 | `system.view` |
| `showcase_system_settings_manager` | `Qiwai123456` | 平台 | `system.manage` |
| `showcase_operation_settings_read` | `Qiwai123456` | 商家 23 | `operation_settings.view` |

## 4. 自动化验证

- 新增契约测试：`apps/api/src/modules/admin/config-check-permission-contract.spec.ts`。
- 限定权限与页面测试：4 文件 45 项通过。
- API 全量：121 文件 670 项通过。
- PC 生产构建：1945 模块通过。
- 权限目录：89 项，前后端契约一致。
- 完整 `npm run test:preflight-guards` 通过。
- 完整 `npm run preflight` 通过，仅提示正式短信生产凭证尚未配置。
- `git diff --check` 通过。

## 5. 浏览器验收

使用应用内浏览器登录 `showcase_system_settings_read`：

1. 登录后可见“系统设置”和“上线体检”两个菜单入口。
2. 独立 `/admin/config-check` 页面成功加载。
3. 页面显示版本 `0.1.0`、环境 `development`、正常 45、待确认 11、需修复 0。
4. 点击“重新检查”后请求成功，页面状态与计数正常刷新。
5. 桌面视口布局正常；390×844 视口可滚动且无明显横向溢出。
6. 本轮新增浏览器 console warning/error 为 0。

## 6. 错误恢复

- 请求失败时显示持久错误区和“重试体检”，不会误显示“暂无体检结果”。
- 加载期间重新检查、重试和空态启动入口禁用，避免重复请求。
- 下一次重试前清理旧错误，成功后恢复正常报告展示。

## 7. 外部待验收

正式短信、微信、支付、对象存储、生产域名与 HTTPS 凭证仍需由项目主体提供。凭证到位后应在目标生产环境重新执行上线体检，并完成真实发送、支付回调、退款、账单、对象存储读写和证书链验收。
