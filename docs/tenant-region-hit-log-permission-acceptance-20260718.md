# 定位命中日志权限与导出验收报告

## 1. 验收范围

本报告对应持续开发计划 `11.01.28`，验证平台定位命中日志在查看、敏感信息查看、Excel 导出、租户隔离、错误恢复和移动端布局方面形成完整闭环。

验收页面：`/admin/tenant-region-hit-logs`

验收接口：

- `GET /admin/tenant-region-hit-logs/options`
- `GET /admin/tenant-region-hit-logs`
- `GET /admin/tenant-region-hit-logs/export`

## 2. 完成内容

### 2.1 权限分层

新增三项平台专属权限：

| 权限 | 能力 |
|---|---|
| `tenant_region_hit_log.view` | 查看筛选项和脱敏日志 |
| `tenant_region_hit_log.sensitive` | 查看精确坐标、完整 IP 和 User-Agent |
| `tenant_region_hit_log.export` | 导出包含敏感字段的 Excel |

权限继承规则：

- `sensitive` 自动包含 `view`。
- `export` 自动包含 `view` 和 `sensitive`。
- 租户账号会剔除上述三项平台权限。
- 区域授权和区域保护写操作继续独立使用 `tenant_region.manage`。

### 2.2 数据安全

普通查看响应执行安全投影：

- 精确经纬度返回 `null`。
- IP 按网段脱敏。
- User-Agent 返回 `null`。
- 响应明确标记 `sensitiveMasked: true`。

只有敏感权限账号可以查看完整坐标、IP 和 User-Agent。Excel 导出要求独立导出权限，最多导出 10000 条，并写入 `export.tenant_region_hit_logs` 审计日志。

### 2.3 页面状态

- 页面使用日志专属筛选选项接口，不再无条件请求平台商家列表。
- 加载与导出提供持久错误、重试和请求互斥。
- 只读模式隐藏地图入口和完整终端信息。
- 导出按钮仅对 `tenant_region_hit_log.export` 显示。
- 最小权限账号登录后可正确回退到日志页面。
- 移动端日期范围和分页不会撑宽页面，长文本在受控区域内展示。
- 同批将社区和商城商家页面遗留的 Element Plus 单选按钮升级到 `value` API，最新构建刷新没有新增兼容性警告。

## 3. 保留测试账号

密码均为 `Qiwai123456`。

| 账号 | 权限 |
|---|---|
| `showcase_region_log_read` | 脱敏查看 |
| `showcase_region_log_sensitive` | 敏感查看，不可导出 |
| `showcase_region_log_export` | 敏感查看和导出 |

测试账号、定位命中日志 `#10`、导出审计 `#7832` 和其他演示数据均已保留。

## 4. 真实 API 验收

执行命令：

```powershell
$env:SHOWCASE_PASSWORD='Qiwai123456'
npm run acceptance:tenant-region-hit-log
```

结果：

| 场景 | 实际结果 |
|---|---|
| 只读账号 | 筛选选项 24 个，命中日志 1 条，敏感字段脱敏，导出返回 403 |
| 敏感账号 | 命中日志 1 条，完整坐标、IP、User-Agent 可见，导出返回 403 |
| 导出账号 | 导出返回 200，XLSX 7135 bytes，生成审计 `#7832` |
| 租户账号 | 跨平台作用域访问返回 403 |

结构化结果：`.local-logs/tenant-region-hit-log-1784351861621/result.json`

导出文件：`.local-logs/tenant-region-hit-log-1784351861621/tenant-region-hit-logs.xlsx`

导出文件 SHA-256：`01BDF85330EAF8341A5637C00CF7255D10678FD0A77D1C18B3688E7BA19C9D73`

## 5. 应用内浏览器验收

### 5.1 只读账号

- 菜单可达，脱敏提示可见。
- 导出按钮和地图入口均为 0。
- 当前表格坐标全部显示“已隐藏”。
- IP 显示为 `::ffff:172.25.*.*` 一类脱敏格式。
- 页面未出现精确坐标。

### 5.2 敏感账号

- 脱敏提示不可见。
- 完整坐标、IP 和 User-Agent 可见。
- 地图入口可见。
- 导出按钮为 0。

### 5.3 导出账号

- 导出按钮为 1，完整敏感字段可见。
- 页面按钮在导出动作结束后恢复可用，没有导出错误提示。
- 应用内浏览器未为 `fetch -> Blob -> a.click()` 方式发出 download event；真实 API 已验证 XLSX 内容、字节数和导出审计，因此该浏览器事件限制不影响服务端及权限完成判定。

### 5.4 响应式与控制台

- 390x844 下文档宽度 `375/375`，页面内容 `351/351`。
- 工具栏和分页均为 `269/269`，长文本溢出数量为 0。
- 恢复默认视口后，视口宽 1014，文档和 body 宽均为 999，无外层横向溢出。
- 最新生产构建使用 `index-CiWVkWIH.js`，刷新后没有新增 warning/error；日志中仅保留构建前旧时间戳的历史单选按钮警告。

## 6. 自动化与构建结果

- 专项测试：5 文件 106 项通过。
- 后续权限专项：2 文件 25 项通过。
- API 全量：126 文件、689 项通过。
- API 构建：通过。
- PC 生产构建：1946 模块通过。
- 完整 preflight：通过。
- 管理员权限目录：93 项通过。
- API Docker：已重建并保持 healthy，MySQL 和数据卷未重建。

完整 preflight 仅保留正式短信凭证可由系统设置提供的既有提醒，与本工作包无关。

## 7. 验收结论

`11.01.28` 已完成。定位命中日志现具备平台专属最小权限、敏感字段分级、租户作用域隔离、受审计 Excel 导出、页面错误恢复和桌面/移动端可用性，可以继续进入下一个 PC 后台页面审计工作包。
