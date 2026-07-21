# CI 质量门禁

CI 使用 Node.js 22，并显式安装项目固定的 `npm@11.6.2`，避免不同 npm 版本对 lockfile、overrides 和生产依赖树产生不同解析结果。

仓库使用 `.github/workflows/quality.yml` 对推送和拉取请求执行自动验证。

## 门禁内容

- 使用各子项目锁文件执行可复现依赖安装。
- API 生产运行时依赖不得包含 high 或 critical 漏洞。
- API 单元测试必须全部通过。
- 上线 preflight 静态守卫必须全部通过。
- shared、API、管理后台和 H5 必须完成生产构建。
- 微信小程序包必须完成构建；Windows 默认 Node 25 时会自动切换到已配置的 Node 22/24 运行时。

## 本地执行

首次或依赖变更后：

```bash
npm run ci:install
```

执行与 CI 相同的完整检查：

```bash
npm run ci:verify
```

`miniprogram-ci` 属于小程序发布工具依赖，仅在开发或源码部署环境安装。Docker API 运行时会移除开发依赖，避免把微信发布工具的旧构建链带入在线 API 容器。
