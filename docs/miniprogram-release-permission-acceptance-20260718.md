# 小程序发布权限与操作状态验收报告

## 1. 验收范围

- 小程序发布配置和发布记录查看权限。
- 保存配置、上传体验版、提交审核、查询审核和发布线上版的管理权限。
- 平台委派账号与商家账号的作用域边界。
- 发布日志敏感信息投影、字段长度边界、错误恢复和操作互斥。
- PC 桌面与 390×844 移动视口。

## 2. 权限模型

| 能力 | 权限 | 作用域 |
|---|---|---|
| 查看配置、阶段和发布记录 | `miniprogram_release.view` | 平台专属 |
| 保存配置、上传、提审、查询审核、发布 | `miniprogram_release.manage` | 平台专属 |

`miniprogram_release.manage` 自动包含 `miniprogram_release.view`。租户账号即使提交上述权限，也会在服务端和前端权限规范化时被剔除。

## 3. 数据与安全整改

- 发布日志响应不返回异常 stack。
- 日志 detail 中包含 secret、token、private key、password、authorization、cookie 的键统一返回 `********`。
- 日志 limit 不是整数时使用 30，合法范围限制为 1-100。
- AppID、Secret、私钥、版本、描述和构建目录按数据库列长度执行 DTO 校验。
- AppSecret 和 CI 私钥读取时只返回是否已配置，不返回明文。

## 4. 保留测试账号与数据

| 账号 | 密码 | 权限 | 结果 |
|---|---|---|---|
| `showcase_miniprogram_read` | `Qiwai123456` | `miniprogram_release.view` | 可查看，不可保存或发布 |
| `showcase_miniprogram_manager` | `Qiwai123456` | `miniprogram_release.manage` | 可查看、保存和执行发布动作 |
| `showcase_operation_settings_read` | `Qiwai123456` | 商家 `operation_settings.view` | 小程序发布接口 403 |

保留配置：ID `1`，AppID `wx-showcase-acceptance`，版本 `0.1.0`，构建目录 `apps/mobile/dist/build/mp-weixin`。真实 API 专项和浏览器各保留一条 `showcase_miniprogram_manager` 保存记录。

## 5. 自动化与真实 API

- 限定测试：6 文件 88 项通过。
- API 全量：123 文件 678 项通过。
- Shared、API、PC 后台和 H5 构建通过；PC 构建 1945 模块。
- 权限目录：90 项，前后端目录一致。
- 完整 seed 成功，原有演示数据保留。
- API Docker 镜像重建后 healthy。
- 完整 `npm run preflight` 通过，仅保留正式短信生产凭证提醒。
- `git diff --check` 通过。

真实专项命令：

```powershell
$env:SHOWCASE_PASSWORD='Qiwai123456'
npm run acceptance:miniprogram-release
```

结果文件：`.local-logs/miniprogram-release-1784347022346/result.json`。

专项结论：

1. 只读账号 GET 配置和日志成功，日志安全投影通过。
2. 只读账号保存配置返回 403。
3. 商家账号读取平台小程序发布配置返回 403。
4. 管理账号保存原配置成功，AppSecret 和私钥配置状态未被意外改变。
5. 管理保存记录落库并可通过脱敏日志接口读取。

## 6. 浏览器验收

只读账号：

- 菜单仅显示“小程序发布”。
- 保存按钮 0，上传/提审/查询/发布按钮 0。
- 7 个配置输入全部禁用。
- 桌面 `scrollWidth=clientWidth=1265`；390×844 下 `scrollWidth=clientWidth=375`。

管理账号：

- 保存按钮 1，发布动作按钮 4，7 个配置输入均可编辑。
- “发布线上版”确认框取消后，发布记录仍为 1，按钮恢复可用，没有请求副作用。
- 保存原配置成功，成功提示出现，发布记录由 1 增至 2。
- 桌面和 390×844 均无横向溢出。
- 最终刷新后新增 console warning/error 为 0。

## 7. 外部待验收

当前没有正式 AppID、AppSecret、CI 私钥、服务器出口 IP 白名单和审核类目，因此没有伪造上传、提审或发布成功。正式资料到位后需在目标生产环境完成：

1. 构建 `mp-weixin` 并上传体验版，验证二维码可用。
2. 在真实微信设备完成登录、报名、签到码和移动管理流程。
3. 提交微信审核并轮询到明确审核结果。
4. 审核通过后发布线上版，验证线上版本号和回滚预案。
