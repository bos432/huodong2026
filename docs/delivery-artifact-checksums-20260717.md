# 交付制品校验清单

更新时间：2026-07-21

算法：SHA-256。校验命令：`Get-FileHash <path> -Algorithm SHA256`。

结构复验命令：`npm run verify:delivery-package -- delivery/activity-registration-candidate-20260721-r36.zip`。该命令检查四端构建、源码、数据库、部署及文档目录，拒绝重复 ZIP 条目，并核对 PC 文件数、整包 SHA-256，以及候选目录内 Manifest 的文件集合和逐文件 SHA-256。源码树复验命令：`npm run verify:delivery-source -- delivery/candidate-20260721-r36/source`。

| 文件 | 字节数 | SHA-256 |
|---|---:|---|
| `package.json` | 8507 | `08FE8377AAC608FE233D887169158CA1F68DE4D8E1ECE7FFA223F37A10175E8F` |
| `docker-compose.yml` | 13092 | `E5A5C76BBA491139F4E67F57B2DB90D53003859ED436018F4CC9FD506C11FE2A` |
| `deploy/.env.production.example` | 7907 | `77188C87367F8628D1F4B31A2DF6F550D48F58F2926F4BE72AB99CFAAEEECCFF` |
| `apps/mobile/dist/build/h5/version.json` | 86 | `888B476409E9846D71E46F4D82255C2C31BCE5B08152BB8D00478ACF8B95A00F` |
| `apps/mobile/dist/build/mp-weixin/project.config.json` | 640 | `E4D2C66EF0007FB7DBA33B75BE9EF817B9D508C89089FADCC88E8A217139092C` |
| `backups/mysql/activity_registration-20260717-030811.sql.gz` | 962309 | `C41079B3E0BD9864EF9FD3FCF6B1F0D8BA47B17BD4E80D9CAC560D903AA318C0` |
| `delivery/activity-registration-candidate-20260717-r25.zip` | 8206706 | `82786FCF60EBF6C0D0A1C0713B0DD417EF009C3D6C4173CB7D2E67C5144D76E0` |
| `delivery/activity-registration-candidate-20260717-r26.zip` | 8321383 | `8B27D8CA61FF43B8B81F847F6A382610BEC3017D5165D8997996CF753D2CA733` |
| `delivery/activity-registration-candidate-20260717-r30.zip` | 9414653 | `B4BC1EA9DCDF9395B2A3E8FCA028B55D4B9FD236D18D7E4943697EE92361571A` |
| `delivery/activity-registration-candidate-20260717-r31.zip` | 9405047 | `706CFE0D47FCD6582DD668D0B891C6B56F06C8E3839ADB54CF08B7EDFA9A538A` |
| `backups/mysql/activity_registration-20260721-095916.sql.gz` | 2055476 | `8D9A3F7497448DB06B611166402F43CC333BCFB341E69F22FE9B836341FBD87E` |
| `backups/private-data/private-data-20260721-095920.tar.gz` | 21165379 | `F1697FED5F9DF5C743972EC1C512735CC45B74595078616F20E6C85FDD062621` |
| `delivery/activity-registration-candidate-20260721-r32.zip` | 33250235 | `4A34CA3540006317413476C1C5E6A398A5D426A0D590DBC0A46AAB852EBDDEC0` |
| `delivery/activity-registration-candidate-20260721-r33.zip` | 33284710 | `70C180E727F07E107B0A60FE5EF0B132DCA0AC388556A7249276A38A240A000E` |
| `delivery/activity-registration-candidate-20260721-r34.zip` | 33289941 | `47EF62976805BA72A548FCC897DF8BF9CB80B87C84BACEBA21A66D948B39260F` |
| `delivery/activity-registration-candidate-20260721-r35.zip` | 33297030 | `E6BD6472A43C9A3AC2A127C64FAAFA8C8F9DD363E3AB7FD374D231879F6EE9A4` |
| `delivery/activity-registration-candidate-20260721-r36.zip` | 33309697 | `72ED3E83B8C15C211FE1EB75DCF616271A691A0A1B9A7EF440D5C462856D680D` |
| `delivery/activity-registration-candidate-20260721-r37.zip` | 33325573 | `C46F4A46CBE150C10B85DDCCC56F534AFF6FD2BCBD573C990C9098D2083D574D` |
| `delivery/activity-registration-candidate-20260721-r38.zip` | 33339969 | `7F319FF7E8817932F9A52D83A2882CC595A77AD0D480BB28D7EEB7CAE156257B` |
| `delivery/activity-registration-candidate-20260721-r39.zip` | 33346906 | `7A8939B61CC52F5BA6CC9E852280A2870AF79E3D5098E8A19A5B3D8A889B94EC` |
| `delivery/activity-registration-candidate-20260721-r40.zip` | 33349543 | `47CCA15A0BDB77240FE1D7FF46D91D514942E59B79A3D7F777A5D6EBF99BC889` |
| `delivery/activity-registration-candidate-20260721-r41.zip` | 33354792 | `4077565F706B6A9DC5BA77662AE08C9A290843B1C8EE171BDFCDC30E75165129` |
| `delivery/activity-registration-candidate-20260721-r42.zip` | 33421285 | `F8D1EF2E6B7FD125D5E13680ECC8B8DAFA438D8C0EB0E6EB894CCE3978CFE254` |
| `delivery/activity-registration-candidate-20260721-r43.zip` | 33442719 | `6B5FA1AAF1F9351B1147B8B8922DAEEC68FDA780969B4D29F74FC7C06F196D31` |
| `delivery/activity-registration-candidate-20260721-r44.zip` | 33448281 | `3A91AB112FC90957E4D2B5AEFD3975AE8385A0E634D262749FE0C295A25A802B` |
| `delivery/activity-registration-candidate-20260721-r45.zip` | 33448817 | `EB37251582460484398DE40B784D1F7AD7E8A8708A83AAD3CF45E9FB0AB386C4` |
| `delivery/activity-registration-candidate-20260721-r46.zip` | 33452093 | `90EE17A82B0DB86A91BDA72C894578793CE25CAD15CE8C2C32E6521F53D70744` |

## 说明

- 该清单校验的是当前候选版本的关键配置、构建版本标识和数据库备份，不代表已生成压缩交付包。
- 生产构建、真实环境配置或数据库备份发生变化后，必须重新生成清单，不能沿用旧校验值。
- `.env.production` 中的真实密钥不得进入交付文档、源码仓库或截图；只交付脱敏模板。
- r32 含 API、PC、H5、微信小程序构建、全量 migration、最新数据库/私有数据备份、部署模板、文档和自包含源码；Manifest 覆盖 3,106 个文件，ZIP 共 3,238 个条目，敏感路径扫描 0 命中。
- 当前有效候选包为 `delivery/activity-registration-candidate-20260721-r46.zip`。r46 在 r45 基线上增加功能开关父子依赖、后台自动联动和常驻说明；Manifest 覆盖 3,162 个文件，ZIP 共 3,296 个条目。实际 `.env`、`.env.production`、支付结果、密钥、依赖目录、运行日志、本地静态发布副本及历史候选目录均未打包。r1-r45 均不得作为当前源码交付。
- 外层 ZIP 的 SHA-256 记录保存在本清单中；包内 Manifest 负责逐文件校验，不递归包含 ZIP 自身哈希。
