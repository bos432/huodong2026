# 大 UI 改造前稳定版本隔离与回滚手册

本文档记录 2026-06-17 做的版本隔离、服务器备份和回滚方法。后续按 `ui.md` 做新中式 UI 大改时，必须先确认大改发生在试验分支，不能直接改 `main`。

## 1. 当前稳定点

本次锁定的稳定版本：

```text
commit: a373eaadefd85d79bf73516be21a8c8101bef937
短提交号: a373eaa
说明: fix: harden h5 registration user flow
```

已经创建并推送到 GitHub 的保护点：

```text
稳定标签: stable-pre-ui-20260617-a373eaa
备份分支: release/stable-pre-ui-20260617
UI 试验分支: feature/qiwai-ui-experiment
```

分支用途：

```text
main
  当前线上主线，只放稳定功能和紧急修复。

release/stable-pre-ui-20260617
  大 UI 改造前的代码备份分支，不在上面开发。

feature/qiwai-ui-experiment
  ui.md 的新中式 UI 大改试验分支。所有大改先在这里做。

stable-pre-ui-20260617-a373eaa
  绝对稳定回滚标签。需要快速回到大改前状态时使用。
```

## 2. 本地开发怎么切换

查看当前分支：

```powershell
cd "E:\2027\活动报名\活动报名"
git branch --show-current
git status
```

切到 UI 试验分支，做 `ui.md` 相关大改：

```powershell
git switch feature/qiwai-ui-experiment
git pull
```

切回稳定主线，做线上紧急修复：

```powershell
git switch main
git pull
```

查看稳定标签是否还在：

```powershell
git tag --list stable-pre-ui-20260617-a373eaa
git show --no-patch --oneline stable-pre-ui-20260617-a373eaa
```

## 3. UI 大改的工作规则

后续如果根据 `ui.md` 调整页面、布局、颜色、菜单、风格：

```text
1. 先确认当前分支是 feature/qiwai-ui-experiment。
2. 所有 UI 大改提交到 feature/qiwai-ui-experiment。
3. 不要直接把 UI 大改提交到 main。
4. 验收满意后，再决定是否合并到 main。
5. 如果不满意，直接丢弃或重做试验分支，main 不受影响。
```

开始 UI 大改前建议执行：

```powershell
git switch feature/qiwai-ui-experiment
git pull
git status
```

确认输出类似：

```text
On branch feature/qiwai-ui-experiment
Your branch is up to date with 'origin/feature/qiwai-ui-experiment'.
nothing to commit, working tree clean
```

## 4. 服务器已经完成的备份

服务器目录：

```text
/www/wwwroot/rd.chaimen666.com
```

服务器已记录稳定 commit：

```text
runtime/rollback-backups/pre-ui-20260617/commit.txt
```

当前记录内容：

```text
a373eaadefd85d79bf73516be21a8c8101bef937
```

服务器代码压缩包：

```text
runtime/rollback-backups/pre-ui-20260617/site-files.tgz
```

已生成数据库备份：

```text
backups/mysql/reader-20260617-034515.sql.gz
```

健康检查当时结果：

```text
HTTP 200
ready: true
api: up
database: up
```

## 5. 服务器确认备份是否还在

登录服务器后执行：

```bash
cd /www/wwwroot/rd.chaimen666.com

cat runtime/rollback-backups/pre-ui-20260617/commit.txt
ls -lh runtime/rollback-backups/pre-ui-20260617/site-files.tgz
ls -lh backups/mysql/reader-20260617-034515.sql.gz
curl -i https://rd.chaimen666.com/api/health/ready
```

正常情况下应该看到：

```text
commit.txt 显示 a373eaadefd85d79bf73516be21a8c8101bef937
site-files.tgz 文件存在
reader-20260617-034515.sql.gz 文件存在
health 接口 HTTP 200
```

## 6. 日常发布试验分支到服务器

如果只是想把 UI 试验分支发布到服务器预览，需要先确认你真的要让线上临时看到试验版。

```bash
cd /www/wwwroot/rd.chaimen666.com

git fetch --all --tags
git checkout feature/qiwai-ui-experiment
git pull

npm --prefix apps/mobile install --legacy-peer-deps
npm --prefix apps/api run build
npm --prefix apps/mobile run build:h5

/www/server/nodejs/v22.22.3/bin/pm2 restart activity-api --update-env
nginx -s reload
```

发布后检查：

```bash
curl -i https://rd.chaimen666.com/api/health/ready
curl -s https://rd.chaimen666.com/ | grep viewport
```

然后人工检查：

```text
H5 首页
活动详情
立即报名
我的
我的报名
报名详情
查看签到码
手机管理端签到核销
后台登录和主要菜单
```

## 7. 快速回滚到大 UI 改造前稳定版本

如果 UI 大改上线后不满意，或者线上出现严重问题，优先用 Git 标签回滚。

```bash
cd /www/wwwroot/rd.chaimen666.com

git fetch --all --tags
git checkout stable-pre-ui-20260617-a373eaa

npm --prefix apps/mobile install --legacy-peer-deps
npm --prefix apps/api run build
npm --prefix apps/mobile run build:h5

/www/server/nodejs/v22.22.3/bin/pm2 restart activity-api --update-env
nginx -s reload
```

回滚后检查：

```bash
git rev-parse HEAD
curl -i https://rd.chaimen666.com/api/health/ready
curl -s https://rd.chaimen666.com/ | grep viewport
```

`git rev-parse HEAD` 应该显示：

```text
a373eaadefd85d79bf73516be21a8c8101bef937
```

## 8. 数据库回滚说明

大多数 UI 改造只改前端页面，不需要回滚数据库。

只有出现以下情况，才考虑数据库恢复：

```text
1. 执行了数据库迁移。
2. 新功能写入了错误数据。
3. 后台配置被大批量改坏。
4. 订单、报名、余额、公益流水等核心数据异常。
```

当前数据库备份文件：

```text
backups/mysql/reader-20260617-034515.sql.gz
```

数据库恢复是高风险操作，恢复前必须先再做一次当前数据库备份：

```bash
cd /www/wwwroot/rd.chaimen666.com
npm run db:backup
```

然后再根据 `scripts/db-restore.mjs` 的项目说明执行恢复。不要在不确认的情况下直接覆盖数据库。

## 9. 如果服务器提示有未提交改动

回滚或切分支时，如果出现类似提示：

```text
Your local changes to the following files would be overwritten by checkout
```

不要强行执行：

```bash
git reset --hard
```

先查看改动：

```bash
git status
git diff --stat
git diff
```

如果确认是服务器临时生成文件或无关文件，再单独处理。不能确定时，先把输出保存下来再判断。

## 10. 常用查询命令

查看当前服务器代码版本：

```bash
cd /www/wwwroot/rd.chaimen666.com
git branch --show-current
git rev-parse HEAD
git log --oneline -5
```

查看远程分支：

```bash
git fetch --all --tags
git branch -a
```

查看 PM2 状态：

```bash
/www/server/nodejs/v22.22.3/bin/pm2 list
```

查看 API 健康：

```bash
curl -i https://rd.chaimen666.com/api/health/ready
```

重新构建 H5：

```bash
npm --prefix apps/mobile install --legacy-peer-deps
npm --prefix apps/mobile run build:h5
nginx -s reload
```

重新构建并重启 API：

```bash
npm --prefix apps/api run build
/www/server/nodejs/v22.22.3/bin/pm2 restart activity-api --update-env
```

## 11. 最重要的记忆点

```text
稳定版本: a373eaa
稳定标签: stable-pre-ui-20260617-a373eaa
试验分支: feature/qiwai-ui-experiment

UI 大改先去 feature/qiwai-ui-experiment。
不满意就回 stable-pre-ui-20260617-a373eaa。
数据库不要轻易恢复，除非确认数据也被改坏。
```
