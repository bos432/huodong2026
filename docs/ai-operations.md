# AI运营草稿

## 能力与边界

入口：活动管理 → 更多 → AI运营草稿。需要活动管理权限，同时校验商家和活动数据范围。

支持活动文案、客服回复建议、复盘建议。服务端从活动记录选取有限字段，不发送报名人列表、群二维码、付款凭据或后台密钥。联系方式进行初步遮蔽，不能替代人工检查。运营人员预览实际发送数据后确认，再生成待审核草稿；不会自动写回活动、发布页面或发送客服消息。

同一请求编号不会重复调用。网络失败、超时或结果截断不会自动重试，也不保证服务商未计费。资料、模型或服务地址改变后必须重新预览；查询状态不触发模型调用。单账号滚动24小时有次数上限。历史请求及来源快照仅在有权限的后台可见。

## 配置

默认关闭。由服务器维护者在 API 环境配置以下字段并按正常发布流程重启 API；不要把真实密钥提交到仓库或发到公开聊天中。

```dotenv
AI_ENABLED=true
AI_API_BASE=https://你的模型服务根地址
AI_MODEL=服务商提供的模型编号
AI_API_KEY=服务商密钥
AI_REQUESTS_PER_ADMIN_DAY=20
AI_REQUEST_TIMEOUT_MS=45000
AI_ALLOW_LOCAL_TEST_SERVER=false
```

服务需兼容非流式 `POST /chat/completions`，使用 Bearer 鉴权、`messages`、`model`、`max_tokens`，响应包含 `choices[0].message.content`。根地址可以包含 `/v1`，但不能包含 `/chat/completions`、查询参数或内嵌凭据。

协议核对参考：[DeepSeek 首次调用](https://api-docs.deepseek.com/)、[Chat Completions 官方参考](https://api-docs.deepseek.com/api/create-chat-completion)。这里没有预设服务商或模型，不代表已购买或开通任何服务。

## 验收

本地模拟验收：`node scripts/acceptance-ai-drafts.mjs`。脚本只监听本机随机端口，使用明确的模拟内容，保留草稿、失败、过期及审计记录。模型调用限制、来源脱敏、并发去重和失败处理不需要真实付费服务即可验证。

接口权限验收：`node scripts/acceptance-ai-permissions.mjs`。检查匿名、只读、跨商家、空活动范围和未配置时拒绝生成。

真实上线仍需用最终选定服务验证文案质量、事实准确性、延迟、费用、数据处理条款和实际服务可用性。本地模拟通过不等于真实模型验收通过；后台会显示模拟标记。

迁移：`1788653200000-AiOperationDrafts.ts`。代码回滚可保留新增表，不要为回滚删除调用审计和草稿。
