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

const activeSection = ref("quick");

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
        commands: ["创建活动", "配置票种和报名字段", "查看报名", "确认收款或审核报名", "发布课程", "配置共修和打卡", "装修首页并前台刷新验证"]
      },
      {
        title: "平台超管闭环",
        description: "确认平台能管住商家、权限和系统。",
        commands: ["创建商家", "分配最小权限", "无权限菜单隐藏", "查看全局订单和会员", "查看操作日志", "执行上线体检", "查看小程序发布记录"]
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
@media (max-width: 1100px) {
  .hero { grid-template-columns: 1fr; }
  .guide-grid { grid-template-columns: 1fr; }
}
</style>
