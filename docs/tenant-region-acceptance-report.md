# 区域授权、定位与租户切换验收报告

## 1. 范围

本批覆盖计划 `01.07`：区域授权与保护、半径/多边形冲突、审批、有效期、定位匹配、未命中兜底、命中日志、城市切换和租户资产边界。

- API 结果：`.local-logs/tenant-region-1784212300000/result.json`
- 浏览器结果：`.local-logs/browser-tenant-region-1784214047119/result.json`
- 环境：最终 Docker API、MySQL 8.4、Nginx PC/H5

## 2. 缺陷整改

区域创建接口会将与已批准独占区域重叠的新区域置为 `pending`，但审批接口此前没有重新检查冲突，平台可以误批准重叠区域。

整改内容：

- `approveTenantRegion` 在批准前重新执行当前区域的半径/多边形冲突检测。
- 冲突批准返回 400，并保留原区域待审批状态。
- 驳回继续保留原因和审计记录。
- 新增自动化回归，固定批准路径必须调用冲突检查。

## 3. API/数据库验收

保留区域：

- A 非冲突区域：`11`。
- B 非冲突区域：`12`。
- B 冲突待审后驳回区域：`13`。

| 场景 | 结果 |
| --- | --- |
| 非冲突区域 | 自动批准，状态 `approved` |
| 半径冲突 | 自动变为 `pending`，包含冲突说明 |
| 审批竞态 | 冲突区域批准返回 400，不允许绕过二次检查 |
| 驳回 | 返回 `rejected`，原因保留 |
| 定位命中 | 坐标 `5,100` 命中 A 租户已批准区域 |
| 定位兜底 | 无匹配坐标返回 `fallback=true` 和可手动选择租户列表 |
| 命中审计 | 命中与未命中日志均可按 source 查询 |
| 有效期 | 生效日期和失效日期参与定位筛选 |

## 4. 浏览器验收

PC 1440x1000：

- 区域保护页显示批准有效区域和已驳回区域。
- 定位命中日志页显示命中、未命中来源和结果。

H5 390x844：

- 城市切换弹层显示资产边界提示：报名、订单、钱包、积分、课程和优惠权益按当前城市商家分别展示。
- 搜索并切换到 `tenant-smoke-a`，确认后写入本地租户编码并保持手动来源。

截图：

- `.local-logs/browser-tenant-region-1784214047119/admin-tenant-regions.png`
- `.local-logs/browser-tenant-region-1784214047119/admin-tenant-region-hit-logs.png`
- `.local-logs/browser-tenant-region-1784214047119/h5-tenant-switcher.png`

## 5. 回归与制品

- API：93 个测试文件、547 项测试通过。
- 全部 preflight guards、`git diff --check` 通过。
- 最终 API 镜像：`sha256:a5a9027cb7ba03975d808710a2fad63bbd075b0018fc9c1d94f6ee7bf714a1e7`。
- 监控 `ok`，告警 0。
- 备份：`backups/mysql/activity_registration-20260716-230456.sql.gz`。
- 备份大小 `925,412` bytes，解压 `12,817,790` bytes，gzip 校验通过。
- SHA-256：`4633C4BA0262C3B3F7D36C1AE1F345070C4F310B781E0E0913B07EA1A9F3764A`。

## 6. 当前边界

本批完成本地生产形态 API、PC/H5 验收；微信真机定位权限、真实地图 SDK、生产地理服务和正式域名仍按全项目外部验收计划保留。
