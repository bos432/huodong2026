# 生产配置中心权限与只读验收报告

## 1. 验收范围

- 平台系统配置查看与维护权限分层。
- 商家运营配置查看与维护权限分层。
- 平台委派账号、商家账号和跨作用域访问边界。
- 密钥掩码、GET 无副作用、错误恢复和操作互斥。
- PC 桌面与 390×844 移动视口。

## 2. 权限模型

| 作用域 | 查看 | 保存/短信测试/连通检测 |
|---|---|---|
| 平台 | `system.view` | `system.manage` |
| 商家 | `operation_settings.view` | `operation_settings.manage` |

`system.manage` 自动包含 `system.view`，`operation_settings.manage` 自动包含 `operation_settings.view`。平台权限为 platform-only，租户账号即使提交该权限也会被服务端剔除。

## 3. 保留测试账号

| 账号 | 密码 | 作用域 | 权限 |
|---|---|---|---|
| `showcase_operation_settings_read` | `Qiwai123456` | 商家 23 | `operation_settings.view` |
| `showcase_operation_settings_only` | `Qiwai123456` | 商家 23 | `operation_settings.manage` |
| `showcase_system_settings_read` | `Qiwai123456` | 平台 | `system.view` |
| `showcase_system_settings_manager` | `Qiwai123456` | 平台 | `system.manage` |

## 4. 自动化与真实 API

- 契约测试：`operation-setting-permission-contract.spec.ts`。
- 权限、角色、菜单专项：4 文件 59 项通过。
- API 全量：120 文件 668 项通过。
- API 构建、PC 生产构建和完整 preflight 通过。
- 权限目录：89 项，前后端目录一致。
- 真实专项命令：`npm run acceptance:operation-settings`。
- 最终结果：`.local-logs/operation-settings-1784345023796/result.json`。

真实专项结果：

1. 四类账号均能读取所属作用域配置，密钥保持 `********` 掩码。
2. 两个只读账号保存、短信测试和连通检测均返回 403。
3. 商家只读账号访问平台配置体检返回 403。
4. 平台委派管理账号可保存、读取体检和执行连通检测。
5. 商家管理账号可保存并执行商家连通检测。
6. 平台配置记录 ID 为 1，商家配置记录 ID 为 23，作用域未串用。

## 5. 浏览器验收

- 平台只读账号自动落地 `/admin/system-settings`，菜单显示“系统设置”和独立“上线体检”。
- 平台只读页面不显示保存、短信测试、连通检测和上传入口；运营配置可编辑控件为 0，部署参数及数字控件不可修改。
- 平台管理账号显示保存和连通检测，浏览器保存成功；配置体检显示运行环境 `development`、版本 `0.1.0`、待确认 11、需修复 0。
- 商家只读账号自动落地 `/admin/system-settings`，菜单仅“运营设置”，无平台部署和体检标签，无保存、短信测试、连通检测和上传入口。
- 桌面视口无横向溢出；390×844 视口布局可滚动、控件不重叠，未出现横向滚动条。
- 最终刷新后新增控制台 warning/error 为 0。

独立上线体检页面的权限、失败恢复和移动视口结果见 `docs/config-check-permission-acceptance-20260718.md`。

## 6. 外部待验收

正式短信、微信、支付和对象存储凭证尚未提供。当前代码、权限、掩码、模拟/关闭状态和连通检测已完成；正式凭证到位后需在目标生产环境执行实际发送、支付回调、退款、账单和对象存储读写验收。完整 preflight 仅保留正式短信凭证提醒。
