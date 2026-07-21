# 伙伴与大使工作台状态验收报告

## 验收范围

- PC 路径：`/admin/ambassador`
- 账号：`showcase_partner_manager / Qiwai123456`
- 权限范围：伙伴查看、维护、敏感查看和导出；不下沉任何商家数据范围
- 验收环境：`http://127.0.0.1:18080`、Docker API/MySQL/Nginx

## 发现与整改

原页面使用单组 `Promise.all`。任一子接口失败时只显示瞬时消息，旧线索、旧合同和旧看板仍可能留在页面上；连续刷新时也没有请求代次保护，晚返回可能覆盖新结果。

本批完成：

1. 将招募概览、落地页、案例、线索、志愿任务、大使档案、贡献和伙伴合同拆为按权限生成的独立数据分区。
2. 使用 `Promise.allSettled` 保留成功分区；请求开始和分区失败时清空对应旧数据，不以旧数据或零值伪装同步成功。
3. 增加请求代次，连续刷新时只有最后一轮结果可以写回。
4. 敏感联系方式和合同揭示结果在刷新时清空，避免授权查看结果长期残留。
5. 增加持久错误正文、失败分区明细、唯一“重新同步”入口和 `aria-live` 状态播报。
6. 浏览器首次故障验收发现 Element Plus 默认插槽覆盖 `description`，已将完整错误详情移入可见正文并重新验收。

## 浏览器验收

| 场景 | 结果 |
|---|---|
| 正常加载 | 19 条伙伴线索、10 份生效合同、18 个已转商家 |
| 敏感信息 | 列表手机号和微信号保持脱敏 |
| API 故障 | 线索和合同均清为 0，显示两个失败分区及 HTTP 502，不显示旧数据 |
| 故障重试 | 仅显示一个“重新同步”入口 |
| API 恢复 | 点击重试后恢复 19/10/18，错误区消失 |
| 桌面布局 | `scrollWidth=clientWidth=1265` |
| 390x844 | 页面 `scrollWidth=clientWidth=375`，表格在内部滚动 |
| 控制台 | 本轮 warning/error 为 0 |

故障注入仅停止并重新启动 `activity-api`，未停止 MySQL、未执行 migration、未修改或删除测试数据。

## 自动化结果

- 菜单/状态专项：1 个文件、23 项通过。
- 完整 `ci:verify`：147.1 秒，退出 0。
- API：158 个测试文件、909 项通过。
- 运行时依赖审计：high=0、critical=0。
- 全量 preflight、Shared/API/PC/H5/微信小程序构建通过。
- 最终运行态：监控 `status=ok/alerts=0`，统一资金 `healthy=true/issueCount=0`，readiness `ready=true/configSummary.blockingCount=0`。
- `git diff --check` 退出 0，仅保留现有 LF/CRLF 转换提示。

## 证据

- 桌面截图：`.local-logs/partner-state-20260720/partner-restored-desktop.png`
- 移动截图：`.local-logs/partner-state-20260720/partner-restored-390x844.png`
- 角色审计：`.local-logs/final-role-account-audit-1784554738719/result.json`
