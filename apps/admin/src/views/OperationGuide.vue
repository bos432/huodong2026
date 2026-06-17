<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { CopyDocument } from "@element-plus/icons-vue";

type GuideBlock = {
  title: string;
  description: string;
  commands: string[];
  notes?: string[];
};

type GuideSection = {
  key: string;
  label: string;
  summary: string;
  blocks: GuideBlock[];
};

type DatabaseTable = {
  group: string;
  name: string;
  meaning: string;
  business: string;
  caution: string;
};

const activeSection = ref("quick");

const databaseTables: DatabaseTable[] = [
  { group: "平台与权限", name: "tenants", meaning: "商家/书院/机构资料。", business: "平台商家管理、多商家隔离、H5 tenantCode。", caution: "停用或改 code 会影响商家后台和前台入口。" },
  { group: "平台与权限", name: "admin_users", meaning: "后台管理员账号、角色、权限列表和所属商家。", business: "超管、商家管理员、运营、财务、签到人员登录。", caution: "不要随意改 role、tenantId、permissions，容易造成越权或看不到菜单。" },
  { group: "平台与权限", name: "admin_operation_logs", meaning: "后台关键操作日志。", business: "审计确认收款、退款、权限、设置等敏感操作。", caution: "上线运营后不要清空，出问题要靠它追责和定位。" },
  { group: "平台与权限", name: "admin_login_logs", meaning: "后台登录记录。", business: "排查异常登录、账号安全、登录失败。", caution: "可归档但不建议直接删除近期记录。" },
  { group: "平台与权限", name: "operation_settings", meaning: "运营设置，例如报名、支付、客服、前台行为配置。", business: "后台系统设置和前台运行规则。", caution: "改错可能导致前台不能报名、支付或展示异常。" },
  { group: "平台与权限", name: "h5_auth_code_logs", meaning: "H5 手机验证码发送和校验记录。", business: "用户登录、验证码排障、短信限流。", caution: "包含手机号等敏感信息，注意权限和脱敏。" },

  { group: "用户会员", name: "users", meaning: "前台用户基础账号。", business: "H5/小程序登录、报名、订单、课程、打卡归属。", caution: "不要手工合并或删除用户，否则订单和学习记录会断。" },
  { group: "用户会员", name: "member_profiles", meaning: "会员扩展资料。", business: "会员管理、微信 openid/unionid、小程序身份、资料补充。", caution: "小程序用户身份字段用于识别同一用户，不要随便清空。" },
  { group: "用户会员", name: "member_levels", meaning: "会员等级配置。", business: "会员运营、等级权益。", caution: "改等级规则前要确认已有会员是否受影响。" },
  { group: "用户会员", name: "member_point_logs", meaning: "会员积分变化记录。", business: "积分发放、扣减、运营活动追踪。", caution: "积分流水是对账依据，不建议删除。" },
  { group: "用户会员", name: "user_tags", meaning: "用户标签。", business: "会员分组、运营筛选、客服标记。", caution: "删除标签会影响后台筛选和用户画像。" },
  { group: "用户会员", name: "user_wallets", meaning: "用户钱包余额。", business: "余额、退款、抵扣等资产能力。", caution: "资产表高风险，必须通过后台或迁移调整并留日志。" },
  { group: "用户会员", name: "wallet_transactions", meaning: "钱包流水。", business: "余额变化记录、财务追踪。", caution: "不要只改余额不写流水，否则财务对不上。" },
  { group: "用户会员", name: "user_favorites", meaning: "用户收藏记录。", business: "活动、课程、动态收藏。", caution: "通常可重建，但删除会影响用户体验。" },
  { group: "用户会员", name: "user_learning", meaning: "用户学习进度。", business: "我的课程、课时学习记录、播放进度。", caution: "误删会导致用户学习记录丢失。" },
  { group: "用户会员", name: "certificates", meaning: "证书或学习证明记录。", business: "课程完成、活动证明、会员荣誉。", caution: "涉及用户权益，删除前要确认。" },
  { group: "用户会员", name: "invite_codes", meaning: "邀请码。", business: "邀请注册、渠道归因、运营推广。", caution: "改邀请码会影响渠道统计。" },

  { group: "活动报名", name: "activities", meaning: "活动主表。", business: "活动列表、详情、报名、审核、上下架。", caution: "活动 tenantId、status、price 等字段会直接影响前台展示和报名。" },
  { group: "活动报名", name: "activity_categories", meaning: "活动分类。", business: "活动筛选、首页分类。", caution: "删除分类可能导致活动分类显示为空。" },
  { group: "活动报名", name: "activity_hosts", meaning: "活动主办方/讲师/嘉宾信息。", business: "活动详情展示。", caution: "一般影响展示，不影响订单。" },
  { group: "活动报名", name: "activity_fields", meaning: "活动报名表单字段。", business: "报名时填写姓名、电话、备注等自定义字段。", caution: "活动已报名后不要随意删字段，历史报名信息可能难解释。" },
  { group: "活动报名", name: "activity_sections", meaning: "活动详情模块。", business: "活动详情富文本、模块化展示。", caution: "影响前台详情页内容。" },
  { group: "活动报名", name: "activity_channels", meaning: "活动渠道。", business: "渠道链接、来源统计、转化分析。", caution: "删除会影响渠道报表。" },
  { group: "活动报名", name: "activity_approval_logs", meaning: "活动审核记录。", business: "平台审核、驳回、通过追踪。", caution: "审计记录不要清理。" },
  { group: "活动报名", name: "activity_reviews", meaning: "活动评价。", business: "用户评价、后台评价管理。", caution: "涉及公开展示和审核。" },
  { group: "活动报名", name: "activity_view_logs", meaning: "活动浏览记录。", business: "浏览量、转化率统计。", caution: "量大时可考虑归档，不建议直接清空近期数据。" },
  { group: "活动报名", name: "registrations", meaning: "活动报名记录。", business: "用户报名状态、审核、签到、订单关联。", caution: "核心表，误改会导致用户报名状态错乱。" },
  { group: "活动报名", name: "ticket_types", meaning: "活动票种。", business: "免费票、付费票、名额、价格。", caution: "改价格或库存会影响报名和订单。" },
  { group: "活动报名", name: "coupons", meaning: "优惠码。", business: "活动优惠、订单减免。", caution: "上线活动中改优惠规则要先通知运营。" },
  { group: "活动报名", name: "waitlists", meaning: "候补记录。", business: "名额满后的候补补位。", caution: "改动会影响候补顺序和用户通知。" },
  { group: "活动报名", name: "check_ins", meaning: "活动签到记录。", business: "现场核销、签到统计。", caution: "签到记录是履约依据，不要随意删除。" },
  { group: "活动报名", name: "conversion_events", meaning: "转化事件。", business: "浏览、报名、支付等漏斗分析。", caution: "用于数据分析，删除会影响报表。" },
  { group: "活动报名", name: "share_visits", meaning: "分享访问记录。", business: "分享传播、渠道统计。", caution: "通常只影响统计。" },

  { group: "订单财务", name: "orders", meaning: "活动订单主表。", business: "活动报名支付、线下确认、退款、财务查询。", caution: "钱和权益的核心表，禁止手工改状态。" },
  { group: "订单财务", name: "course_orders", meaning: "课程订单。", business: "课程购买、线下确认、我的课程权益。", caution: "确认状态会影响用户能否学习课程。" },
  { group: "订单财务", name: "refunds", meaning: "退款记录。", business: "订单退款、退款审核、退款状态。", caution: "退款必须和订单、支付流水一致。" },
  { group: "订单财务", name: "payment_transactions", meaning: "支付流水。", business: "支付请求、支付结果、服务商交易号。", caution: "对账关键表，不能随意改金额和状态。" },
  { group: "订单财务", name: "payment_callback_logs", meaning: "支付回调日志。", business: "微信/支付宝/模拟支付回调排查。", caution: "支付异常时第一时间看这里。" },
  { group: "订单财务", name: "payment_statement_records", meaning: "服务商账单记录。", business: "微信/支付宝账单导入、对账差异。", caution: "财务对账依据，不建议删除。" },
  { group: "订单财务", name: "agents", meaning: "代理/收款主体。", business: "地区代理、商家收款归属。", caution: "改归属会影响收款账户和结算。" },
  { group: "订单财务", name: "agent_payment_accounts", meaning: "代理或商家收款账户。", business: "微信/支付宝/线下收款配置。", caution: "收款信息敏感，修改必须有权限和日志。" },
  { group: "订单财务", name: "agent_settlements", meaning: "代理结算单。", business: "代理分成、结算审核、财务打款。", caution: "财务核心表，不能随意删除或改金额。" },
  { group: "订单财务", name: "agent_settlement_transfers", meaning: "代理结算打款记录。", business: "打款请求、回执、失败原因。", caution: "自动打款或沙箱打款排查要看这里。" },

  { group: "课程共修", name: "courses", meaning: "课程主表。", business: "课程列表、详情、价格、上下架。", caution: "价格和状态会影响前台购买。" },
  { group: "课程共修", name: "course_chapters", meaning: "课程章节。", business: "课程目录分组。", caution: "删除章节会影响课时归属。" },
  { group: "课程共修", name: "course_lessons", meaning: "课程课时。", business: "视频/音频/图文课时、播放学习。", caution: "课时地址和状态影响用户学习。" },
  { group: "课程共修", name: "community_activities", meaning: "共修活动。", business: "共修列表、活动规则、报名参与。", caution: "影响打卡入口和共修展示。" },
  { group: "课程共修", name: "checkin_tasks", meaning: "共修打卡任务。", business: "每日/指定日期打卡任务。", caution: "日期和状态错了，用户会看不到或重复打卡。" },
  { group: "课程共修", name: "community_checkins", meaning: "共修打卡记录。", business: "用户已打卡状态、打卡内容。", caution: "误删会导致刷新后又提示打卡。" },
  { group: "课程共修", name: "community_posts", meaning: "学员动态。", business: "动态发布、展示、审核。", caution: "涉及用户内容，需要审核和敏感处理。" },
  { group: "课程共修", name: "community_post_likes", meaning: "动态点赞记录。", business: "点赞状态、点赞数。", caution: "用于防重复点赞。" },
  { group: "课程共修", name: "community_post_comments", meaning: "动态评论记录。", business: "评论列表、评论审核。", caution: "涉及用户内容和审核。" },

  { group: "装修通知公益小程序", name: "homepage_sections", meaning: "前台装修模块。", business: "首页、我的、服务中心等页面装修和预览。", caution: "保存错误会直接影响前台展示。" },
  { group: "装修通知公益小程序", name: "announcements", meaning: "公告。", business: "前台公告、后台公告管理。", caution: "公开展示内容要审核。" },
  { group: "装修通知公益小程序", name: "notification_templates", meaning: "通知模板。", business: "短信、站内、微信订阅消息模板。", caution: "模板变量错误会导致通知失败。" },
  { group: "装修通知公益小程序", name: "notifications", meaning: "通知记录。", business: "发送给用户的通知、站内消息。", caution: "可用于客服排查是否通知到用户。" },
  { group: "装修通知公益小程序", name: "notification_schedules", meaning: "通知计划。", business: "定时通知、活动提醒。", caution: "时间配置错误会造成误发或漏发。" },
  { group: "装修通知公益小程序", name: "charity_fund_settings", meaning: "公益池设置。", business: "公益比例、规则、展示配置。", caution: "会影响公益金额计算和展示。" },
  { group: "装修通知公益小程序", name: "charity_fund_transactions", meaning: "公益资金流水。", business: "公益池收入、拨付、流水。", caution: "资金相关，不可随意改删。" },
  { group: "装修通知公益小程序", name: "charity_projects", meaning: "公益项目。", business: "公益项目展示、募集、拨付。", caution: "公开项目内容和财务信息要谨慎。" },
  { group: "装修通知公益小程序", name: "charity_project_disbursements", meaning: "公益项目拨付记录。", business: "公益款项拨付、凭证。", caution: "财务审计依据。" },
  { group: "装修通知公益小程序", name: "ambassador_landing_settings", meaning: "文化大使招募页设置。", business: "招募落地页装修和规则。", caution: "影响公开招募页面。" },
  { group: "装修通知公益小程序", name: "ambassador_cases", meaning: "文化大使案例。", business: "招募页案例展示。", caution: "公开内容需审核。" },
  { group: "装修通知公益小程序", name: "ambassador_applications", meaning: "文化大使申请。", business: "用户提交申请、后台审核。", caution: "包含个人信息，注意隐私。" },
  { group: "装修通知公益小程序", name: "miniprogram_release_settings", meaning: "小程序发布配置。", business: "AppID、CI 私钥、版本号、发布说明。", caution: "私钥敏感，只有超管可维护。" },
  { group: "装修通知公益小程序", name: "miniprogram_release_logs", meaning: "小程序发布日志。", business: "上传、提审、查询、发布、失败原因。", caution: "排查发布失败和追踪操作人要看这里。" }
];

const sections: GuideSection[] = [
  {
    key: "quick",
    label: "常用命令",
    summary: "超级管理员最常用的一组命令：H5、小程序、后台、后端、数据库迁移和重启。",
    blocks: [
      {
        title: "构建 H5 前台",
        description: "用户访问 https://rd.chaimen666.com/ 看到的 H5 页面。装修、活动、课程、我的页面更新后通常需要执行。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "npm --prefix apps/mobile install --legacy-peer-deps", "npm --prefix apps/mobile run build:h5"],
        notes: ["构建产物目录：apps/mobile/dist/build/h5", "Nginx 根路径应指向该目录。"]
      },
      {
        title: "构建微信小程序",
        description: "生成微信开发者工具或 miniprogram-ci 使用的小程序代码包。注意：构建不等于上线，仍需要上传、审核、发布。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "npm --prefix apps/mobile install --legacy-peer-deps", "npm --prefix apps/mobile run build:mp-weixin"],
        notes: ["构建产物目录：apps/mobile/dist/build/mp-weixin", "小程序需要在后台“小程序发布”或微信开发者工具里上传审核。"]
      },
      {
        title: "构建后台管理端",
        description: "超级管理员和商家管理员访问 /admin/ 看到的后台页面。菜单、权限页、装修页、系统设置页更新后需要执行。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "npm --prefix apps/admin install", "npm --prefix apps/admin run build"],
        notes: ["构建产物目录：apps/admin/dist", "如果菜单没出现，先 grep 后台 dist 包里是否包含关键字。"]
      },
      {
        title: "构建后端 API 并执行迁移",
        description: "接口、实体、权限、数据库结构、支付、订单、发布管理等后端变更后需要执行。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "npm --prefix apps/api install", "npm --prefix apps/api run build", "npm --prefix apps/api run migration:run"],
        notes: ["迁移只会执行未执行过的 migration。", "生产环境禁止用 synchronize 自动改表。"]
      },
      {
        title: "重启服务与重载 Nginx",
        description: "后端 API 构建后必须重启 PM2；前端静态包更新后建议检查并重载 Nginx。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "/www/server/nodejs/v22.22.3/bin/pm2 restart activity-api --update-env", "nginx -t", "nginx -s reload"],
        notes: ["nginx -t 通过后再 reload。", "PM2 online 不等于业务正常，还要访问 health 接口。"]
      }
    ]
  },
  {
    key: "deploy",
    label: "完整上线",
    summary: "从 Git 拉代码到构建三端、迁移数据库、重启服务、验证线上结果的完整流程。",
    blocks: [
      {
        title: "上线前检查 Git 状态",
        description: "先确认服务器在哪个分支、是否有本地改动，避免构建旧代码或覆盖服务器文件。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "git branch --show-current", "git status --short", "git log --oneline -5"],
        notes: ["当前主分支：feature/qiwai-ui-experiment", "如果有 package-lock 噪音，先 stash，不要 reset --hard。"]
      },
      {
        title: "安全拉取最新代码",
        description: "只允许快进拉取。若失败，说明服务器有冲突或本地提交，需要先处理，不要强制覆盖。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "git fetch origin", "git pull --ff-only origin feature/qiwai-ui-experiment"],
        notes: ["如果 --ff-only 报错，把报错给开发者处理。", "不要在生产服务器随意执行 git reset --hard。"]
      },
      {
        title: "完整构建和迁移",
        description: "适合功能升级后执行，覆盖 H5、后台、小程序构建、API 构建和数据库迁移。",
        commands: [
          "cd /www/wwwroot/rd.chaimen666.com",
          "npm --prefix apps/admin install",
          "npm --prefix apps/admin run build",
          "npm --prefix apps/mobile install --legacy-peer-deps",
          "npm --prefix apps/mobile run build:h5",
          "npm --prefix apps/mobile run build:mp-weixin",
          "npm --prefix apps/api install",
          "npm --prefix apps/api run build",
          "npm --prefix apps/api run migration:run",
          "/www/server/nodejs/v22.22.3/bin/pm2 restart activity-api --update-env",
          "nginx -t",
          "nginx -s reload"
        ],
        notes: ["如果只改 H5，可以只构建 mobile:h5。", "如果只改后台，可以只构建 admin。", "如果有数据库迁移，必须执行 migration:run。"]
      },
      {
        title: "上线后验证",
        description: "确认 API、后台、H5 都访问的是新版本，而不是旧静态包或旧服务。",
        commands: [
          "curl -i https://rd.chaimen666.com/api/health/ready",
          "curl -I https://rd.chaimen666.com/admin/",
          "curl -I https://rd.chaimen666.com/",
          "/www/server/nodejs/v22.22.3/bin/pm2 status",
          "grep -R \"小程序发布\" apps/admin/dist/assets/*.js"
        ],
        notes: ["grep 可以换成你本次功能的关键字。", "浏览器需要 Ctrl + F5 强刷后台。"]
      }
    ]
  },
  {
    key: "local",
    label: "本地开发",
    summary: "开发者本机启动 API、后台、H5，并做构建验证。",
    blocks: [
      {
        title: "安装全部依赖",
        description: "首次开发或依赖变更后执行。",
        commands: ["npm run install:all"]
      },
      {
        title: "启动本地后端 API",
        description: "后端接口开发时使用 watch 模式。",
        commands: ["npm run dev:api"]
      },
      {
        title: "启动本地后台",
        description: "后台默认开发端口 5174。",
        commands: ["npm run dev:admin"],
        notes: ["常用地址：http://127.0.0.1:5174/admin/login"]
      },
      {
        title: "启动本地 H5",
        description: "前台 H5 开发调试。",
        commands: ["npm run dev:mobile:h5"]
      },
      {
        title: "本地构建验证",
        description: "提交前至少验证改动涉及的端能构建通过。",
        commands: ["npm --prefix apps/api run build", "npm --prefix apps/admin run build", "npm --prefix apps/mobile run build:h5", "npm --prefix apps/mobile run build:mp-weixin"]
      }
    ]
  },
  {
    key: "database",
    label: "数据库",
    summary: "数据库迁移、备份、恢复和生产注意事项。",
    blocks: [
      {
        title: "查看迁移状态",
        description: "检查有哪些 migration 已执行、哪些待执行。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "npm --prefix apps/api run migration:show"]
      },
      {
        title: "执行迁移",
        description: "后端表结构或历史数据修复上线时执行。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "npm --prefix apps/api run migration:run"],
        notes: ["显示 No migrations are pending 表示没有待执行迁移。", "如果功能依赖新表但迁移没执行，接口通常会报表不存在。"]
      },
      {
        title: "数据库备份",
        description: "上线前、批量导入前、执行高风险迁移前必须备份。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "npm run db:backup"],
        notes: ["备份目录通常在 backups。", "备份完成后建议确认文件大小不是 0。"]
      },
      {
        title: "数据库恢复",
        description: "只在明确需要回滚数据时使用，执行前必须确认目标库和备份文件。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "npm run db:restore"],
        notes: ["恢复会影响线上数据，必须先暂停写入或确认低峰期。", "恢复前后都要记录操作人、时间和原因。"]
      },
      {
        title: "生产数据库原则",
        description: "避免数据事故的底线。",
        commands: ["grep -n \"DB_SYNCHRONIZE\" apps/api/.env .env"],
        notes: ["生产必须 DB_SYNCHRONIZE=false。", "禁止直接删表删字段，除非有备份和回滚方案。", "所有结构变化通过 migration。"]
      }
    ]
  },
  {
    key: "troubleshoot",
    label: "排查问题",
    summary: "线上菜单不显示、页面不更新、接口报错、502 等常见问题的排查入口。",
    blocks: [
      {
        title: "后台菜单不显示",
        description: "判断是代码没拉、后台没构建、权限没给，还是浏览器缓存。",
        commands: [
          "cd /www/wwwroot/rd.chaimen666.com",
          "git log --oneline -5",
          "grep -R \"菜单关键字\" apps/admin/src apps/admin/dist/assets/*.js",
          "npm --prefix apps/admin run build",
          "nginx -T | grep -A12 -B3 \"location ^~ /admin/\""
        ],
        notes: ["src 有、dist 没有：后台没重新构建。", "dist 有、页面没有：强刷浏览器或检查权限。", "src 都没有：服务器代码没拉最新。"]
      },
      {
        title: "H5 页面不更新",
        description: "判断 mobile H5 是否构建、Nginx 是否指向正确目录。",
        commands: [
          "cd /www/wwwroot/rd.chaimen666.com",
          "npm --prefix apps/mobile run build:h5",
          "ls -l apps/mobile/dist/build/h5/index.html",
          "nginx -T | grep -A8 -B3 \"root /www/wwwroot/rd.chaimen666.com/apps/mobile/dist/build/h5\""
        ]
      },
      {
        title: "API 接口异常",
        description: "看服务状态、健康检查和 PM2 日志。",
        commands: [
          "curl -i https://rd.chaimen666.com/api/health/ready",
          "/www/server/nodejs/v22.22.3/bin/pm2 status",
          "/www/server/nodejs/v22.22.3/bin/pm2 logs activity-api --lines 100"
        ]
      },
      {
        title: "Nginx 或 502",
        description: "检查 Nginx 配置、错误日志和 API 是否在线。",
        commands: ["nginx -t", "tail -n 100 /www/wwwlogs/rd.chaimen666.com.error.log", "curl -i https://rd.chaimen666.com/api/health/ready"],
        notes: ["502 多数是 API 没启动、端口不通或 Nginx upstream 配置错误。"]
      },
      {
        title: "小程序构建后没生效",
        description: "小程序不是构建即上线，需要上传体验版、提交审核、发布线上版。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "npm --prefix apps/mobile run build:mp-weixin", "ls apps/mobile/dist/build/mp-weixin"],
        notes: ["H5 构建后刷新可生效。", "小程序必须经过微信审核发布。"]
      }
    ]
  },
  {
    key: "rollback",
    label: "回滚应急",
    summary: "出现严重线上问题时，按先保留现场、再回滚代码、最后处理数据的顺序操作。",
    blocks: [
      {
        title: "保留现场",
        description: "回滚前先记录当前版本、日志和错误，方便事后定位。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "git rev-parse HEAD", "git log --oneline -5", "/www/server/nodejs/v22.22.3/bin/pm2 logs activity-api --lines 200", "tail -n 200 /www/wwwlogs/rd.chaimen666.com.error.log"]
      },
      {
        title: "代码回滚建议",
        description: "优先用 git revert 或切回确认稳定提交。不要直接 reset --hard，除非明确知道会丢什么。",
        commands: ["cd /www/wwwroot/rd.chaimen666.com", "git log --oneline -10", "git revert <问题提交ID>", "npm --prefix apps/admin run build", "npm --prefix apps/mobile run build:h5", "npm --prefix apps/api run build", "/www/server/nodejs/v22.22.3/bin/pm2 restart activity-api --update-env", "nginx -t && nginx -s reload"],
        notes: ["如果只回滚前端，不一定需要数据库操作。", "如果 migration 已改变生产数据，先找开发者确认，不要盲目 migration:revert。"]
      },
      {
        title: "恢复后验证",
        description: "确认核心入口恢复，而不是只看服务 online。",
        commands: ["curl -i https://rd.chaimen666.com/api/health/ready", "curl -I https://rd.chaimen666.com/admin/", "curl -I https://rd.chaimen666.com/", "/www/server/nodejs/v22.22.3/bin/pm2 status"]
      }
    ]
  },
  {
    key: "acceptance",
    label: "验收清单",
    summary: "上线运营前，按用户、商家、超管、财务、技术五个角色验收。",
    blocks: [
      {
        title: "用户前台闭环",
        description: "确认用户不看说明书也能完成关键动作。",
        commands: ["登录 H5", "查看首页装修", "报名活动并生成订单", "查看我的订单状态", "购买或确认课程后进入我的课程", "完成打卡后刷新状态保持"],
        notes: ["未登录必须拦截。", "未购买课程不能播放。", "未配置真实支付不能假成功。"]
      },
      {
        title: "商家运营闭环",
        description: "确认一家书院能独立运营。",
        commands: ["确认商家拥有对应权限", "创建活动", "配置票种和报名字段", "查看报名", "确认收款或审核报名", "发布课程", "配置共修和打卡", "有 homepage.manage 权限时装修首页并前台刷新验证"],
        notes: ["商家不是默认都能装修，必须由超管分配首页装修权限。", "当前商家识别主要靠 tenantCode/二维码/手动切换；定位授权后自动匹配区域商家属于后续区域保护功能。"]
      },
      {
        title: "平台超管闭环",
        description: "确认平台能管住商家、权限和系统。",
        commands: ["创建商家", "规划商家/代理经营区域", "分配最小权限", "无权限菜单隐藏", "查看全局订单和会员", "查看操作日志", "执行上线体检", "查看小程序发布记录"],
        notes: ["如果要区域保护，必须先定义区域边界、排他规则、兜底商家和手动切换策略。"]
      },
      {
        title: "财务客服闭环",
        description: "确认钱、订单、用户权益一致。",
        commands: ["按用户手机号查订单", "确认线下收款", "处理退款", "查看对账", "定位用户我的课程/报名状态问题"]
      },
      {
        title: "技术运维闭环",
        description: "确认上线后能查、能备份、能恢复。",
        commands: ["API health 正常", "PM2 online", "Nginx 配置正确", "migration 无待执行", "备份成功", "回滚路径清楚"]
      }
    ]
  }
];

function commandText(block: GuideBlock) {
  return block.commands.join("\n");
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("命令已复制");
  } catch {
    ElMessage.error("复制失败，请手动选中复制");
  }
}
</script>

<template>
  <div class="page">
    <div class="hero">
      <div>
        <span class="eyebrow">SUPER ADMIN RUNBOOK</span>
        <h2>超级管理员运维教程</h2>
        <p>覆盖 H5、小程序、后台、后端、数据库、部署、排查、回滚和上线验收。每次升级先看这里，别让服务器变成“薛定谔的新版本”。</p>
      </div>
      <div class="hero-card">
        <strong>核心原则</strong>
        <span>先查 Git 版本，再构建正确端，再执行迁移，最后验证线上结果。</span>
      </div>
    </div>

    <el-alert type="warning" show-icon :closable="false" class="notice" title="生产操作提醒" description="涉及数据库、回滚、权限和支付的操作要先备份、保留日志，并确认当前分支和提交。不要在生产服务器随意 reset --hard。" />

    <el-tabs v-model="activeSection" class="guide-tabs">
      <el-tab-pane v-for="section in sections" :key="section.key" :name="section.key" :label="section.label">
        <div class="section-head">
          <h3>{{ section.label }}</h3>
          <p>{{ section.summary }}</p>
        </div>
        <template v-if="section.key === 'database'">
          <el-alert type="info" show-icon :closable="false" class="database-alert" title="给非技术人员的理解方式" description="数据库可以理解成系统的账本。每一张表是一类账本：用户账本、订单账本、活动账本、课程账本、装修账本。生产环境不要直接改账本，能在后台操作就不要进数据库。" />
          <div class="database-summary">
            <div>
              <strong>{{ databaseTables.length }}</strong>
              <span>业务数据表</span>
            </div>
            <div>
              <strong>先备份</strong>
              <span>再迁移或恢复</span>
            </div>
            <div>
              <strong>不手改</strong>
              <span>订单、钱包、支付、权限</span>
            </div>
          </div>
        </template>
        <div class="guide-grid">
          <el-card v-for="block in section.blocks" :key="block.title" shadow="never" class="guide-card">
            <template #header>
              <div class="card-head">
                <div>
                  <strong>{{ block.title }}</strong>
                  <p>{{ block.description }}</p>
                </div>
                <el-button :icon="CopyDocument" text type="primary" @click="copy(commandText(block))">复制</el-button>
              </div>
            </template>
            <pre><code>{{ commandText(block) }}</code></pre>
            <ul v-if="block.notes?.length" class="notes">
              <li v-for="note in block.notes" :key="note">{{ note }}</li>
            </ul>
          </el-card>
        </div>
        <div v-if="section.key === 'database'" class="database-map">
          <div class="database-map-head">
            <div>
              <h3>数据库表说明</h3>
              <p>按业务分类说明每张表存什么、用在哪里、操作时要注意什么。</p>
            </div>
          </div>
          <el-table :data="databaseTables" border stripe class="database-table">
            <el-table-column prop="group" label="分类" width="160" />
            <el-table-column prop="name" label="表名" width="230">
              <template #default="{ row }"><code class="table-name">{{ row.name }}</code></template>
            </el-table-column>
            <el-table-column prop="meaning" label="这张表存什么" min-width="220" />
            <el-table-column prop="business" label="对应业务" min-width="240" />
            <el-table-column prop="caution" label="注意事项" min-width="260" />
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.page { display: grid; gap: 18px; }
.hero { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 18px; padding: 24px; border-radius: 18px; background: linear-gradient(135deg, #102338, #1d4d58 52%, #d18b3c); color: #fff; box-shadow: 0 18px 45px rgba(15, 35, 56, 0.18); }
.hero h2 { margin: 6px 0 10px; font-size: 28px; }
.hero p { margin: 0; max-width: 780px; color: rgba(255,255,255,0.86); line-height: 1.7; }
.eyebrow { font-size: 12px; letter-spacing: 0.14em; color: rgba(255,255,255,0.68); }
.hero-card { align-self: stretch; display: grid; align-content: center; gap: 8px; padding: 18px; border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; background: rgba(255,255,255,0.12); backdrop-filter: blur(10px); }
.hero-card strong { font-size: 18px; }
.hero-card span { color: rgba(255,255,255,0.82); line-height: 1.6; }
.notice { border-radius: 12px; }
.guide-tabs { padding: 18px; border-radius: 16px; background: #fff; border: 1px solid #e5e7eb; }
.section-head { margin-bottom: 14px; }
.section-head h3 { margin: 0 0 6px; color: #0f172a; }
.section-head p { margin: 0; color: #64748b; line-height: 1.6; }
.guide-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.guide-card { border-radius: 14px; border-color: #e2e8f0; overflow: hidden; }
.card-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.card-head strong { display: block; color: #0f172a; font-size: 15px; margin-bottom: 5px; }
.card-head p { margin: 0; color: #64748b; font-size: 13px; line-height: 1.5; }
pre { margin: 0; padding: 14px; overflow: auto; border-radius: 12px; background: #0f172a; color: #e2e8f0; line-height: 1.65; font-size: 12px; }
code { font-family: "Cascadia Mono", Consolas, monospace; }
.notes { margin: 12px 0 0; padding-left: 18px; color: #475569; line-height: 1.7; font-size: 13px; }
.notes li { margin: 3px 0; }
.database-alert { margin-bottom: 14px; border-radius: 12px; }
.database-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
.database-summary > div { display: grid; gap: 4px; padding: 14px; border-radius: 14px; background: #f8fafc; border: 1px solid #e2e8f0; }
.database-summary strong { color: #0f172a; font-size: 18px; }
.database-summary span { color: #64748b; font-size: 12px; }
.database-map { margin-top: 18px; display: grid; gap: 12px; }
.database-map-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-end; }
.database-map h3 { margin: 0 0 6px; color: #0f172a; }
.database-map p { margin: 0; color: #64748b; line-height: 1.6; }
.database-table { border-radius: 12px; overflow: hidden; }
.table-name { padding: 2px 6px; border-radius: 6px; background: #eef2ff; color: #1e3a8a; }
@media (max-width: 1100px) {
  .hero { grid-template-columns: 1fr; }
  .guide-grid { grid-template-columns: 1fr; }
  .database-summary { grid-template-columns: 1fr; }
}
</style>
