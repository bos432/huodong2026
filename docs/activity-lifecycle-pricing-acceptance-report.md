# 活动生命周期与票种定价验收报告

## 1. 验收范围

本报告记录计划 `02.01-02.04` 的真实 MySQL、最终 Docker API、PC 和 H5 浏览器验收：活动分步向导、草稿、复制、版本、发布检查、分类详情、地图与主办方、分享和渠道归因、完整审核发布状态机，以及早鸟价、会员价、阶梯价、库存和限购。

- API 结果：`.local-logs/activity-lifecycle-pricing-1784207058474/result.json`
- 浏览器结果：`.local-logs/browser-activity-lifecycle-pricing-20260716130522/result.json`
- 租户：`23 / qiwai-showcase`
- 执行命令：`npm run acceptance:activity-lifecycle-pricing`、`npm run browser:activity-lifecycle-pricing`
- 执行环境：最终 Docker API + MySQL 8.4 + Nginx H5/PC

## 2. 缺陷与整改

真实付费活动发布检查首次错误提示未配置支付方式。原因是 `operation_settings.paymentMethods` 为 JSON 对象，旧逻辑按数组读取 `.length`，导致所有已配置支付方式的付费活动仍被误判。

整改内容：

- 新增 `hasPaidPaymentMethod`，兼容支付方式对象并只认可已启用的付费渠道。
- 发布检查统一调用该函数，不再依赖错误的数组长度假设。
- 增加免费活动、空配置、禁用渠道和启用渠道的 5 项生命周期测试。
- 最终镜像中专项 API、浏览器和完整 smoke 均已复测通过。

浏览器验收脚本同时修复了三个定位问题：深链 `activityId` 自动打开编辑抽屉、Element Plus 隐藏菜单节点的严格定位，以及活动副本标题的包含匹配。上述调整只影响测试定位，不修改业务数据。

## 3. API 与数据库验收

最终保留数据：

- 分类：`25`。
- 生命周期活动：`161 / 【活动生命周期验收保留】1784207058474`。
- 已取消副本活动：`162`。
- 渠道：`4 / LIFE07058474`；渠道报名：`10399`。
- 邀请码：`A161U20805HEYL`。
- 票种活动：`163 / 【票种定价验收保留】1784207058474`。
- 票种：`57 / 限量早鸟会员阶梯票`；并发成功报名：`10401`。

| 场景 | 结果 |
| --- | --- |
| 分步向导与版本 | 创建 V1、编辑 V2、恢复 V1 后生成 V3，快照和恢复内容正确 |
| 草稿与复制 | 复制生成独立草稿，副本后续状态不影响原活动 |
| 发布检查 | 必填内容、票种和付费方式均由服务端检查 |
| 审核状态机 | 提交、撤回、再提交、驳回、再提交、通过全部成功 |
| 上下线与时间 | 下架、重新上架、过去时间拒绝、定时发布 worker、手动结束通过 |
| 取消联动 | 副本审核后取消，关联报名同步取消 |
| 分类与内容 | 分类、图文详情、地图坐标/导航、主办方和分享配置完整 |
| 渠道归因 | 唯一渠道码、访问 1、报名 1，报名率 100% |
| 票种价格 | 原价、早鸟 70.00 元、会员 60.00 元及销量阶梯配置正确 |
| 库存并发 | 容量 1 的两名会员同时报名，仅一笔成功，另一笔返回售罄，无超卖 |
| 非法请求 | 草稿直接通过、重复渠道码、过去定时发布时间、重复阶梯阈值均返回 4xx |

测试会员密码均为 `Qiwai123456`：

- `13107058474`
- `13207058474`
- `13307058474`
- `13407058474`
- 浏览器验收会员：`13016130522`

脚本结束后回读确认 `activityPublishReviewRequired=false`，套餐恢复并保持 `standard`。

## 4. 浏览器验收

H5 390x844 与 PC 1440x1000 共 6 项通过：

1. H5 活动地图、导航和主办方。
2. H5 限量早鸟票种与售罄状态。
3. PC 五步活动向导、地图和分享配置。
4. PC 活动 V1/V2/V3 版本记录。
5. PC 渠道链接、访问和报名转化。
6. PC 早鸟、会员、阶梯、库存和限购配置。

截图位于 `.local-logs/browser-activity-lifecycle-pricing-20260716130522/`：

- `h5-activity-map-host.png`
- `h5-ticket-pricing-sold-out.png`
- `admin-activity-wizard.png`
- `admin-activity-versions.png`
- `admin-activity-channel-report.png`
- `admin-ticket-pricing-rules.png`

## 5. 回归与制品

- API：92 个测试文件、543 项用例全部通过。
- 全部 preflight guards 通过，`git diff --check` 无空白错误。
- Shared、API、PC、H5 和微信小程序构建通过。
- 最终 API 镜像：`sha256:81b984d8ce4a551f254fa18cbca1ed2c1f13fb1a61ec2877d57446f3fb2b5204`。
- 新镜像上 API ready，健康监控 `ok`、告警 0，完整线上演示 smoke 通过。
- 数据库备份：`backups/mysql/activity_registration-20260716-211558.sql.gz`。
- 备份大小：896,077 bytes；解压后 12,497,068 bytes；gzip 校验通过。
- SHA-256：`C88C476084DA9DDA7B503D2883715CDD3BE60B0C1621FB85FF03320DD2EE1A16`。

## 6. 结论

`02.01-02.04` 的本地生产形态数据库、API、并发和 PC/H5 浏览器验收完成，无未整改的阻塞或高风险缺陷。微信小程序真机分享、地图拉起及正式微信环境仍纳入全项目真机与外部配置验收，不影响本批服务端和 PC/H5 完成判定。
