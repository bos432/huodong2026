# 私有数据备份复核记录

日期：2026-07-17

## 结果

- `npm run private-data:backup` 通过。
- 备份文件：`backups/private-data/private-data-20260717-034135.tar.gz`
- 文件大小：1425 bytes
- SHA-256：`FF723FD0A22021D87DFDA3A3A78723B134688B639E48DDFAB50FBE811F3FC6A1`
- 归档包含 `private-data/aid-documents/` 及 10 份加密援助材料，文件名和内容未写入日志。
- 归档路径校验满足恢复脚本的 `private-data/` 根目录和无 `..` 穿越约束。

## 恢复边界

新增 `PRIVATE_DATA_RESTORE_TARGET_DIR` 后可在工作区内执行隔离恢复，不触碰 API 容器私有卷；本轮已恢复到 `.local-logs/private-data-restore-drill-20260717`，核对 9 个文件、1,368 bytes。正式生产恢复仍应先停止写入并使用明确回滚点。

恢复脚本要求显式设置 `PRIVATE_DATA_RESTORE_CONFIRM=private-data`，并会写回 API 容器的 `/app/private-data`。本轮只完成备份和归档校验，没有覆盖当前私有卷；正式恢复演练应先停止写入、再使用隔离容器或明确回滚点执行。
