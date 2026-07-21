# 公告与营销弹窗状态治理验收报告

## 范围

- 页面：`/admin/announcements`、`/admin/marketing-popups`
- 账号：`showcase_admin`，运营角色
- 验收日期：2026-07-21

## 实现结果

- 公告列表、公告选项、弹窗列表和弹窗选项分别使用独立请求代次；读取开始和失败时清除对应旧数据。
- 列表响应绑定租户、关键词、状态、类型或投放维度及分页，迟到响应不能覆盖当前筛选。
- 公告与弹窗编辑保存、快捷状态操作和删除均冻结记录 ID、租户、筛选及列表代次，提交或确认后再次复核目标。
- 编辑抽屉打开、图片上传或写请求执行期间，顶部列表筛选与分页锁定；编辑既有记录时归属租户不可变。
- 营销弹窗生效检测绑定检测记录、租户、页面、平台及列表代次；开始新检测先清空旧结果，迟到检测不能回写。

## 浏览器验收

| 场景 | 公告 | 营销弹窗 |
|---|---|---|
| 正常数据 | `Total 12` | `Total 8` |
| 正常专项 | 保留公告列表完整 | 首页/H5 命中 `marketing-popup-permission-1784383236664`，8 条检测明细 |
| API 中断 | 列表与选项均 502，`Total 0`，旧演示公告消失 | 列表 502，`Total 0`，旧首页弹窗消失 |
| 独立恢复 | 分别重试选项和列表，恢复 12 条 | 重试列表，恢复 8 条 |
| 编辑范围锁定 | 打开首条编辑抽屉，3 个筛选输入禁用；取消 | 打开首条编辑抽屉，4 个筛选输入禁用；取消 |
| 数据写入 | 无 | 无 |
| 390x844 | `clientWidth=375`、`scrollWidth=375` | `clientWidth=375`、`scrollWidth=375` |
| 控制台 | warning 0，error 0 | warning 0，error 0 |

截图：

- `.local-logs/announcement-popup-state-20260721/announcement-mobile-390x844.png`
- `.local-logs/announcement-popup-state-20260721/popup-mobile-390x844.png`

## 自动化与运行状态

- `announcement-permission-contract.spec.ts`：4/4。
- `marketing-popup-permission-contract.spec.ts`：5/5。
- PC 生产构建：通过。
- `npm run ci:verify`：131 秒，退出 0；API 158 个测试文件 921 项、全部 preflight、Shared/API/PC/H5/微信小程序构建通过。
- 运行时依赖审计：high 0，critical 0。
- 监控：`status=ok`，`alerts=0`。
- 统一资金：`healthy=true`，`issueCount=0`。
- readiness：`ready=true`，`blockingCount=0`。
- Docker：API、MySQL 均为 healthy。
- 差异格式检查：退出 0，仅存在既有行尾转换提示。

## 外部验收

正式短信/微信消息、对象存储图片、小程序版本发布和微信真机展示继续按生产配置清单终验。本工作包未新增、删除或修改公告和营销弹窗数据。
