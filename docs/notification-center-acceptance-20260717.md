# 统一通知中心验收记录（2026-07-17）

- 租户：tenantId=23；后台账号：`showcase_ops`；会员：userId=192。
- 真实 MySQL 已存在 notifications、notification_templates、notification_schedules、notification_preferences 及对应迁移结构。
- 模板预览正确渲染会员名、活动标题、地点和时间，未知变量仍由服务端拒绝。
- 保留通知 128：站内信发送成功，tenantScopeKey=`tenant:23`，变量快照和服务商回执已保存。
- 保留通知 129：会员退订 site 渠道后发送被抑制，状态 suppressed、provider=preference，并保留抑制原因；验收后已恢复订阅。
- 保留通知 130：无活动失败通知按通知自身 tenantScopeKey 完成重试，retryCount=1、状态 sent；修复前该路径会因只检查活动租户而错误返回 404。
- PC 通知中心显示渠道就绪状态、模板、偏好和三条保留记录；site 已就绪，短信、微信、邮件因未配置正式凭据显示未启用；页面无横向溢出。
- 新增通知租户作用域纯函数及 3 项测试；API 全量测试、API/PC 构建通过，API 容器 healthy。
- 腾讯云/螺丝帽短信、微信订阅消息和 SMTP 真实发送必须取得正式密钥后复核，当前未伪造通道验收。
