<script setup lang="ts">
type FlowStep = {
  title: string;
  owner: string;
  description: string;
  outputs: string[];
};

type FlowLane = {
  title: string;
  subtitle: string;
  steps: FlowStep[];
};

const lanes: FlowLane[] = [
  {
    title: "平台超级管理员",
    subtitle: "先搭好平台规则，再把商家管起来。",
    steps: [
      { title: "开通商家", owner: "超管", description: "创建商家/代理，配置商家编码、地区、联系人和启停状态。当前系统主要用 tenantCode 识别商家。", outputs: ["商家资料", "tenantCode", "运营状态"] },
      { title: "分配权限", owner: "超管", description: "按最小权限给商家或员工开后台账号，没权限的菜单不显示。", outputs: ["管理员账号", "角色权限", "操作边界"] },
      { title: "规划区域保护", owner: "超管/运营", description: "上线前要明确每个商家/代理的经营城市、区县、排他范围和兜底商家；定位自动分发需要单独开发闭环。", outputs: ["经营区域", "排他规则", "兜底策略"] },
      { title: "配置收款与规则", owner: "超管/财务", description: "配置收款账户、报名审核、活动发布审核、系统设置和小程序发布配置。", outputs: ["收款账户", "审核规则", "系统配置"] },
      { title: "监管运营", owner: "超管", description: "查看全局订单、活动、报名、会员、操作日志和上线体检。", outputs: ["风险待办", "审计日志", "运营看板"] }
    ]
  },
  {
    title: "商家/代理运营",
    subtitle: "商家负责内容、报名、课程、共修和用户服务。",
    steps: [
      { title: "装修前台", owner: "商家运营", description: "只有拿到首页装修权限的商家账号才能配置首页、我的、服务中心、底部菜单和公告；无权限时使用平台默认装修或联系超管开通。", outputs: ["装修模块", "公告", "H5 页面"] },
      { title: "发布活动", owner: "商家运营", description: "创建活动、票种、报名字段、优惠码；若平台要求审核，需要等待超管通过。", outputs: ["活动详情", "票种库存", "报名表单"] },
      { title: "发布课程/共修", owner: "书院运营", description: "配置课程、课时、课程价格、共修活动和打卡任务。", outputs: ["课程列表", "共修任务", "打卡入口"] },
      { title: "处理订单和服务", owner: "运营/财务", description: "查看报名、确认线下收款、处理退款、签到核销、答复用户问题。", outputs: ["订单状态", "报名状态", "签到记录"] }
    ]
  },
  {
    title: "普通学员",
    subtitle: "用户从前台完成浏览、报名、购买、学习和打卡。",
    steps: [
      { title: "进入 H5/小程序", owner: "用户", description: "当前可通过商家链接、二维码、tenantCode 或手动切换进入指定书院；定位授权后自动匹配区域商家属于后续区域保护闭环。", outputs: ["首页", "活动列表", "课程列表"] },
      { title: "登录与报名", owner: "用户", description: "未登录先登录，选择活动、填写报名表、生成订单或等待审核。", outputs: ["用户身份", "报名记录", "订单"] },
      { title: "付款/确认", owner: "用户/财务", description: "未接真实支付时走线下确认；后台确认后用户权益生效。", outputs: ["已确认订单", "我的报名", "我的课程"] },
      { title: "学习与打卡", owner: "用户", description: "已购课程可播放，参与共修后打卡，刷新后状态应保持。", outputs: ["学习进度", "打卡记录", "评论点赞"] }
    ]
  },
  {
    title: "技术运维",
    subtitle: "保证系统可部署、可追踪、可恢复。",
    steps: [
      { title: "拉取代码", owner: "技术/超管", description: "确认分支和提交，使用 git pull --ff-only 拉最新代码。", outputs: ["最新代码", "提交记录"] },
      { title: "构建发布", owner: "技术/超管", description: "按变更范围构建 H5、后台、小程序和 API，执行数据库迁移。", outputs: ["前端静态包", "API dist", "migration"] },
      { title: "重启验证", owner: "技术/超管", description: "重启 PM2，重载 Nginx，检查 health、后台、H5 和关键页面。", outputs: ["PM2 online", "Nginx OK", "线上可访问"] },
      { title: "备份回滚", owner: "技术/超管", description: "上线前备份，异常时保留日志、回滚代码，必要时恢复数据库。", outputs: ["备份文件", "错误日志", "回滚记录"] }
    ]
  }
];

const businessChecks = [
  "超管创建商家 -> 创建管理员 -> 分配权限 -> 商家能登录后台",
  "超管授予 homepage.manage -> 商家装修首页 -> 前台 H5 刷新后展示一致",
  "商家发布活动 -> 用户报名 -> 后台审核/确认 -> 用户我的页面状态变化",
  "课程上架 -> 用户下单 -> 后台确认收款 -> 我的课程可学习",
  "共修打卡任务创建 -> 用户打卡 -> 刷新后仍显示已打卡",
  "小程序构建 -> 上传体验版 -> 提交审核 -> 审核通过后发布"
];

const regionalChecks = [
  "定位授权：H5/小程序首次进入时说明用途，用户同意后获取经纬度。",
  "区域匹配：后端按城市/区县、半径或多边形边界匹配商家/代理，排他区域不能互相覆盖。",
  "手动切换：用户拒绝定位或定位失败时，可以手动选择城市/书院，并记住本次选择。",
  "兜底展示：当前位置没有匹配商家时，展示平台默认页或引导用户选择区域。",
  "运营审计：超管修改经营区域、排他规则和兜底商家时必须记录操作日志。"
];
</script>

<template>
  <div class="page">
    <div class="hero">
      <span>OPERATING MAP</span>
      <h2>系统操作流程图</h2>
      <p>给超级管理员、商家/代理、普通学员和技术运维看的全局流程。先看角色，再看每一步产出，就不容易迷路。</p>
    </div>

    <div class="flow-board">
      <section v-for="lane in lanes" :key="lane.title" class="lane">
        <div class="lane-head">
          <h3>{{ lane.title }}</h3>
          <p>{{ lane.subtitle }}</p>
        </div>
        <div class="steps">
          <article v-for="(step, index) in lane.steps" :key="step.title" class="step">
            <div class="step-index">{{ index + 1 }}</div>
            <div class="step-body">
              <div class="step-title">
                <strong>{{ step.title }}</strong>
                <em>{{ step.owner }}</em>
              </div>
              <p>{{ step.description }}</p>
              <div class="outputs">
                <span v-for="item in step.outputs" :key="item">{{ item }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <el-card shadow="never" class="check-card">
      <template #header>
        <div>
          <strong>上线运营必须跑通的闭环</strong>
          <p>这几条不是技术概念，是实际运营能不能收钱、交付、追责的关键。</p>
        </div>
      </template>
      <div class="check-list">
        <div v-for="item in businessChecks" :key="item">{{ item }}</div>
      </div>
    </el-card>

    <el-card shadow="never" class="check-card regional-card">
      <template #header>
        <div>
          <strong>区域保护与定位分发（后续二开重点）</strong>
          <p>现在系统主要靠 tenantCode 和手动切换识别商家；如果要做到“用户打开后按当前位置展示当地商家”，需要补齐下面这条闭环。</p>
        </div>
      </template>
      <div class="check-list">
        <div v-for="item in regionalChecks" :key="item">{{ item }}</div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page { display: grid; gap: 18px; }
.hero { padding: 24px; border-radius: 20px; background: radial-gradient(circle at 10% 0%, rgba(234,179,8,.35), transparent 30%), linear-gradient(135deg, #14312d, #244d41 52%, #bf7b38); color: #fff; box-shadow: 0 18px 45px rgba(20,49,45,.18); }
.hero span { font-size: 12px; letter-spacing: .16em; color: rgba(255,255,255,.7); }
.hero h2 { margin: 8px 0 10px; font-size: 28px; }
.hero p { margin: 0; max-width: 760px; color: rgba(255,255,255,.86); line-height: 1.7; }
.flow-board { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.lane { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px; display: grid; gap: 14px; }
.lane-head h3 { margin: 0 0 6px; color: #0f172a; }
.lane-head p { margin: 0; color: #64748b; line-height: 1.6; }
.steps { display: grid; gap: 12px; }
.step { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 12px; align-items: start; }
.step-index { width: 32px; height: 32px; border-radius: 999px; display: grid; place-items: center; background: #ecfdf5; color: #047857; font-weight: 800; }
.step-body { padding: 12px; border-radius: 14px; background: #f8fafc; border: 1px solid #e2e8f0; }
.step-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.step-title strong { color: #0f172a; }
.step-title em { font-style: normal; color: #0f766e; font-size: 12px; background: #ccfbf1; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.step-body p { margin: 8px 0 10px; color: #475569; line-height: 1.6; font-size: 13px; }
.outputs { display: flex; flex-wrap: wrap; gap: 6px; }
.outputs span { font-size: 12px; color: #334155; background: #fff; border: 1px solid #dbe3ef; border-radius: 999px; padding: 3px 8px; }
.check-card { border-radius: 16px; }
.check-card :deep(.el-card__header) strong { color: #0f172a; font-size: 16px; }
.check-card :deep(.el-card__header) p { margin: 6px 0 0; color: #64748b; }
.check-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.check-list div { padding: 12px; border-radius: 12px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; line-height: 1.5; }
.regional-card .check-list div { background: #ecfeff; border-color: #a5f3fc; color: #155e75; }
@media (max-width: 1100px) {
  .flow-board, .check-list { grid-template-columns: 1fr; }
}
</style>
