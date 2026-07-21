# 数据库备份恢复演练记录

演练时间：2026-07-14 12:49-13:14 +08:00

## 演练范围

- 源库：`activity_registration`
- 独立恢复库：`activity_registration_restore_drill_20260714`
- 备份文件：`backups/mysql/activity_registration-20260714-124901.sql.gz`
- 备份大小：335380 字节（约 0.32 MB）
- SHA-256：`40036599C368BC43EE0FD526ACABDCCF7ED211E4E469AE5AE2853D724854BD36`
- 恢复库保留，用于后续回归和证据复核；未覆盖源库及现有测试数据。

## 执行结果

| 项目 | 结果 |
| --- | --- |
| 一致性备份 | 通过，`mysqldump --single-transaction` 完成时间约 2.7 秒 |
| 独立库恢复 | 通过，恢复时间约 21.8 秒 |
| 表结构 | 源库与恢复库均为 199 张基础表 |
| 全表行数 | 199 张表逐表比较，无差异 |
| migration | 源库与恢复库均为 171 条，无待执行 migration |
| 核心数据 | 管理员 151、租户 18、用户 239、活动 144、报名 228、活动订单 228、商城订单 111、课程订单 19，恢复前后相同 |
| 钱包账本 | 182 条，金额合计 5083045 分，缺失哈希 0 |
| 公益账本 | 58 条，金额合计 22640 分，缺失哈希 0 |
| 数据库对象 | 钱包哈希链触发器在恢复库存在且定义恢复成功 |
| migration 回滚 | `CharityLedgerHistoryBackfill1783780000000` 执行 `revert` 成功，58 条历史流水恢复为旧态 |
| migration 重放 | 再次 `run` 成功，58 条流水重新生成完整 SHA-256 哈希链 |
| API 恢复 | 新镜像启动后容器 healthy，`/api/health/ready` 返回 `ready: true` |

## 整改记录

恢复核对时发现历史公益流水仍标记为 `legacy_v1`，58 条记录没有 `entryHash`。已新增 migration `1783780000000-CharityLedgerHistoryBackfill.ts`，按账户、创建时间和主键顺序重建整数分余额、流水序号、前后哈希和账户头哈希，并复用运行时 `charityLedgerEntryHash` 规范。

演练库完成逐笔 SHA-256 重算校验、回滚、重放后，源库在备份和停止 API 写入的条件下执行升级。源库最终校验结果：5 个公益账户、58 条流水、历史流水 0、缺失哈希 0、校验问题 0。

## RPO 与 RTO

- 本次恢复相对备份快照的数据丢失为 0，实测 RPO 为 0；生产 RPO 仍取决于备份调度频率和异地复制延迟。
- 本地 0.32 MB 数据集的纯数据库恢复时间约 21.8 秒。
- 源库 migration、数据校验、容器重建到 ready 的维护窗口约 22 秒。
- 生产环境需按真实数据量、网络和对象存储规模重新压测，不能直接套用本地时间。

## 尚待完成

- 将数据库和私有文件备份复制到异地对象存储，并验证保留期、加密、下载和恢复权限。
- 在生产等规模测试库再次测量 RPO/RTO。
- 对私有援助材料、支付凭据等私有卷执行独立恢复演练。

## 2026-07-16 增量复核

- 当前备份：`backups/mysql/activity_registration-20260716-131331.sql.gz`。
- SHA-256：`68FAD7406FFA8358E077AD544132AC052B346B72445B332A1ABA452AD3680F22`。
- 最终增量备份：`backups/mysql/activity_registration-20260716-131951.sql.gz`，SHA-256：`3B0814AD4897F332A9E0904393396188846334E977BF3F4B7638EEC0129FF3F8`，GZip 解压 `2,988,764` bytes。
- 独立恢复库：`activity_registration_restore_drill_20260716`；199 张基础表逐表行数一致，关键订单、支付、退款、钱包、商城和公益金额分汇总一致。
- 迁移演练：172 条 migration，最后一条回退后重跑成功；源 API `/api/health/ready` 保持 `ready=true`。
- 恢复脚本新增流式 DEFINER 元数据清理，避免普通业务账号恢复触发器时要求 `SUPER` 权限；私有数据归档已在隔离工作目录恢复。
