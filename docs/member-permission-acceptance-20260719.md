# 会员中心权限、隐私与积分并发治理验收报告

## 1. 验收结论

本报告对应持续开发计划 `11.01.44`。会员中心已完成查看、资料维护、密码、积分、生命周期、敏感身份和导出七权分层，并完成专属 options、服务端分页筛选、会员详情及跨业务资产白名单投影、敏感访问审计、岗位活动数据范围、积分幂等并发保护、生命周期扫描串行化、服务端 Excel 导出和 PC 七角色闭环。

验收结论：通过。最新真实 API 数据、浏览器截图和专项账号均已保留；本工作包没有新增 migration，现有 179 个 migration 文件与数据库 179 条记录一致。

本工作包不代表会员 CRM 阶段整体完成。`member_levels` 当前仍是全局模型，活动、课程、商城、公告和营销受众的会员等级租户化继续在后续工作包推进。

## 2. 权限模型

| 权限 | 能力 |
|---|---|
| `member.view` | 查看会员列表、详情、最小选项和统计摘要 |
| `member.manage` | 新增会员、维护本租户会员资料 |
| `member.password` | 按全局身份边界重置会员密码 |
| `member.points.manage` | 调整积分并查看本租户后台调整流水 |
| `member.lifecycle.manage` | 扫描到期等级和积分权益 |
| `member.sensitive` | 查看完整手机号、OpenID、UnionID 和 AppID |
| `member.export` | 导出当前权限及数据范围内的会员 |

- 六类操作权限分别自动包含 `member.view`，彼此互不包含。
- API、PC 权限目录、路由、菜单、默认角色和线上展示 seed 已同步，权限目录共 136 项。
- 七个最小账号登录后均可直接进入会员页，不依赖商家管理、钱包或其他会员操作权限。

## 3. API、查询与数据范围

- 新增 `GET /admin/members/options`，仅返回当前权限范围内所需的最小商家、会员等级和筛选选项。
- 新增 `GET /admin/members/export`，最多导出 10000 条，并使用独立导出权限和审计。
- 列表支持关键词、来源、手机号绑定、微信绑定、等级、活跃时间、标签、活动数据范围、分页和排序。
- 列表和详情使用显式白名单投影，不再返回完整用户实体。
- 课程、商城、社区、钱包和时间线只返回页面所需字段，不返回 payload、订单快照、地址、账户配置或内部身份字段。
- 岗位活动数据范围同时作用于会员列表、详情、写操作和导出，跨租户或范围外对象按 404 处理。

## 4. 隐私、密码与审计

- 普通账号手机号服务端脱敏为前三后四，OpenID、UnionID 和 AppID 返回 `null`。
- 敏感账号可查看完整身份字段，并记录 `member.sensitive.view` 审计。
- PC 端统一通过权限感知的 `displayPhone()` 和公共 `maskPhone()` 展示手机号；完整 preflight 曾发现三处未使用批准展示函数，整改后隐私门禁通过。
- 无敏感权限编辑资料时不提交手机号，避免脱敏值覆盖真实号码。
- `member.manage` 不能在创建会员时夹带初始密码；密码能力由 `member.password` 独立控制。
- 租户账号不能重置同时属于其他商家的全局用户密码，避免跨租户身份接管。

## 5. 积分与生命周期并发

- 积分调整必须提供稳定 `idempotencyKey`、非空原因和受控数值边界。
- 积分写入使用会员/租户命名锁、事务和业务幂等键；未知结果重试可复用同一业务键。
- 最新并发验收两次同键请求均返回 201，其中一次标记幂等命中；积分只从 `0` 增加到 `37`，流水只生成一条。
- 积分扣减不得形成负余额，到期、补发和后台调整保留原因、操作者及时间。
- 生命周期扫描使用租户级命名锁串行执行；两次并发扫描均安全返回，过期记录只处理一次。
- 时间线敏感值替换增加数字边界，不再把 13 位时间戳误识别为手机号。

## 6. 保留账号与数据

账号密码均为 `Qiwai123456`：

| 账号 | 用途 |
|---|---|
| `showcase_member_read` | 会员只读和脱敏验收 |
| `showcase_member_manager` | 新增和资料维护验收 |
| `showcase_member_password` | 独立密码重置验收 |
| `showcase_member_points` | 独立积分调整与幂等验收 |
| `showcase_member_lifecycle` | 独立到期权益扫描验收 |
| `showcase_member_sensitive` | 完整微信身份和手机号只读验收 |
| `showcase_member_export` | 独立导出权限验收 |
| `admin` | 平台范围、跨租户和钱包边界验收 |

最新真实 API 证据：`.local-logs/member-permission-1784399142527/result.json`。

| 对象 | 保留数据 |
|---|---|
| 商家 | `#23` |
| 会员 | `#31074` |
| 幂等积分流水 | `#780` |
| 到期积分流水 | `#781` |
| 跨租户边界会员 | `#31072` |
| 最新审计 | `#12439-#12449` |

上一轮浏览器全角色验收保留会员 `#31073`、积分流水 `#778/#779`，证据位于 `.local-logs/member-permission-1784397988414/`。

## 7. 真实 API 验收

| 场景 | 结果 |
|---|---|
| 七类权限矩阵 | 通过，越权接口返回 403 |
| 跨租户及活动数据范围 | 范围外详情和写操作返回 404 |
| 普通手机号 | `138****2527` |
| 敏感手机号 | `13899142527` |
| 敏感 OpenID | `openid-member-permission-1784399142527` |
| 内部字段泄露 | 未发现 |
| 同键积分并发 | `201/201`，一次真实执行、一次幂等返回 |
| 积分与流水 | `0 -> 37`，仅一条流水 |
| 生命周期并发 | `201/201`，到期记录只处理一次 |
| Excel 导出 | 200，XLSX Content-Type 正确，手机号仍脱敏 |

## 8. 应用内浏览器验收

七角色证据：`.local-logs/member-permission-1784397988414/browser/result.json`。

- 只读账号仅有刷新入口；维护、密码、积分、生命周期、敏感和导出账号分别只显示所属操作。
- 普通账号显示脱敏手机号且不显示微信身份；敏感账号显示完整手机号、OpenID、UnionID 和 AppID，但没有写操作。
- 详情补齐加载、失败、重试和移动端响应式状态。
- 390x844 下页面和详情抽屉均无横向溢出，抽屉 `clientWidth=390/scrollWidth=390`，左右边界为 `0/390`。
- 999x900 下页面 `clientWidth=999/scrollWidth=999`，详情抽屉为 780px，无横向溢出。
- 隐私展示整改后的最新复验位于 `.local-logs/member-permission-1784399142527/browser/result.json`，完整手机号和微信身份显示正确，控制台 error 为 0。
- 截图位于两次证据目录的 `browser/` 下。

## 9. 自动化与发布门禁

| 检查 | 结果 |
|---|---|
| 会员限定测试 | 4 文件，116 项通过 |
| API 全量测试 | 142 文件，793 项通过 |
| Shared/API/PC/H5 构建 | 通过 |
| PC 构建 | 1946 模块 |
| 微信小程序构建 | 通过 |
| 线上展示 seed | 通过，原数据和专项数据保留 |
| 权限目录一致性 | 136 项通过 |
| 完整 `npm run preflight` | 通过 |
| migration 状态 | 179 个文件、数据库 179 条记录 |
| Docker | API、MySQL healthy，Nginx running，ready=true |
| `git diff --check` | 通过 |

预检仅保留正式短信凭证提醒；ready 中的生产密钥、正式域名、对象存储、HSTS 和正式外部通道为全项目上线前配置项，不属于本工作包功能缺陷。

## 10. 复测命令

```powershell
$env:SHOWCASE_PASSWORD='Qiwai123456'
$env:API_BASE='http://127.0.0.1:18080/api'
npm run acceptance:member-permissions
npm run seed:online-showcase
npm test
npm run build
npm run build:mobile:mp-weixin
npm run preflight
docker compose -p activity-registration ps
```
