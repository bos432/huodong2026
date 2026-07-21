# 上线体检状态闭环验收（2026-07-21）

## 范围

- 页面：`/admin/config-check`
- 平台验收账号：`admin`
- 补齐配置体检的失败清空、请求代次、响应校验和窄屏布局；不修改任何配置值或判定口径。

## 实现

- 每轮检查增加请求代次，迟到响应不能覆盖当前体检结果。
- 请求开始、响应异常或失败时清空上一轮结论、汇总和配置明细，避免故障态继续显示旧的上线判断。
- 校验总体状态、汇总对象和检查项数组后才渲染结果。
- 390px 窄屏下头部、错误恢复和十项汇总改为纵向布局。

## 浏览器验收

- 正常态 56 项：正常 45、待确认 11、需修复/阻断 0、上线前确认 6、按需确认 5。
- 桌面 `1066/1066`，控制台 warning/error 0。
- 停止 API 后重新检查，10 张汇总卡和 56 条明细立即清空，请求完成后持久显示 HTTP 502 与“重试体检”。
- API 恢复 healthy 后重试，56 项及 `45/11/0/6/5` 完整回归。
- 390x844 为 `clientWidth=scrollWidth=375`，标题高度 31px，控制台 warning/error 0。
- 截图：`.local-logs/config-check-state-20260721/mobile.png`。
- 最终恢复 `showcase_admin` 工作台 `1081/1081`，控制台 warning/error 0。

## 自动化与运行态

- PC 类型检查和生产构建通过。
- 专项 3 文件、8 项通过。
- 完整 `ci:verify` 146.8 秒退出 0；运行依赖 high/critical 0，全部测试、preflight 和 Shared/API/PC/H5/微信小程序构建通过。
- 监控 `status=ok`、`alerts=0`；readiness `ready=true`、`blockingCount=0`。
- 统一资金 `healthy=true`、`issueCount=0`；活动 330、课程 91、商城 815、钱包流水 463、结算 26。
- API/MySQL healthy，Nginx running；差异检查无空白错误。

## 结论

计划表 `11.01.73` 上线体检状态闭环通过。正式域名、密钥、对象存储、支付和消息通道仍按页面列出的上线前配置项执行。
