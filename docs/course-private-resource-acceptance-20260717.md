# 07.01 课程私有资源验收记录

## 验收结论

- 状态：已完成，微信真机在正式 AppID 和合法域名下复核。
- 可重复脚本：`npm run acceptance:course-resource`。
- 保留课程：课程 `5`「【演示】传统文化专题服务」。
- 保留资源课时：章节 `12`、课时 `20`。
- 已购会员：`13990000005 / Qiwai123456`。

## 私有文件与授权

- 上传真实 2 MB 文本附件，原始大小 2,097,152 bytes。
- 服务端保存为 AES-GCM 加密 `.enc` 文件和独立 metadata，不保存可直接访问的明文文件。
- 上传令牌绑定课程、租户、上传管理员、原文件名、MIME 和大小；绑定课时时再次验签并标记 claimed。
- 游客访问付费课程时课时 `locked=true`，附件地址和正文均为 null。
- 已购会员播放器收到 15 分钟签名资源 URL，完整下载解密内容与上传内容逐字节一致。

## HTTP 与安全验收

- 完整请求：200。
- `Range: bytes=0-15`：206，Content-Range 和 16 字节内容正确。
- 超出文件范围：416，返回 `Content-Range: bytes */2097152`。
- 篡改签名：404。
- 使用当前生产签名密钥生成已过期但签名有效的短链：404。
- 响应包含 `Accept-Ranges: bytes`、私有缓存和附件 Content-Disposition。
- 课程播放器写入用户、课程、课时、资源类型、IP 和终端访问日志。

## 备份与恢复材料

- 私有数据备份：`backups/private-data/private-data-20260717-105033.tar.gz`，4.04 MB。
- 归档包含 `private-data/course-resources` 下密文与 metadata。
- 既有私有数据恢复脚本可恢复整个 namespace；未对当前在线数据卷执行破坏性覆盖恢复。

## 浏览器验收

- H5 已购会员可看到并打开私有附件课时，目录不显示锁定。
- 附件名 `course-resource-acceptance.txt` 和“打开附件”操作正常展示。
- “打开附件”补充 `role=button`、键盘焦点、回车操作和动态 aria-label，浏览器识别为按钮。
- 页面无横向溢出，console warning/error 为 0。

## 回归结果

- 课程资源鉴权和私有令牌专项 6 项通过。
- 上传安全 preflight 通过。
- H5 生产构建通过。
- 微信小程序生产构建及认证配置补丁通过。
- `git diff --check` 无空白错误，仅 Windows 换行提示。
