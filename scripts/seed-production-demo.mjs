import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const demoTenantCode = 'manpi-demo';
export const demoMarker = 'production-demo-20260906-v1';
const disclosure = '演示活动：仅供产品体验，不代表真实举办安排。价格为示例，不开放报名或付款，请勿前往虚拟场地。封面为公开样图，不是活动现场照片。';

export function assertDemoTarget(options, confirmation) {
  if (options.database !== 'reader' || options.host !== '127.0.0.1' || Number(options.port) !== 3306 || confirmation !== 'rd.chaimen666.com/reader/manpi-demo') {
    throw new Error('Production demo target confirmation mismatch; no writes performed.');
  }
}

export function assertOwnedDemoTenant(tenant) {
  if (tenant && (tenant.code !== demoTenantCode || tenant.settings?.demoContentMarker !== demoMarker)) {
    throw new Error('Existing merchant is not owned by this demo import.');
  }
}

export function demoActivity(item, template, saturday) {
  const date = new Date(+saturday + item.dayOffset * 86400000).toISOString().slice(0, 10);
  const start = new Date(`${date}T${item.time}:00+08:00`);
  return {
    title: item.title, coverUrl: `/uploads/demo-activities/${item.id}.jpg`,
    description: `${disclosure}\n\n## 活动介绍\n${item.intro || template.intro}\n\n## 适合谁\n${template.audience}\n\n## 可以带走什么\n${template.outcome}`,
    notice: `${disclosure}\n\n${template.materials}\n\n照片和作品公开使用须另行征得本人同意。`,
    location: item.location, locationCity: '演示城市', startTime: start,
    endTime: new Date(+start + template.durationMinutes * 60000),
    registrationDeadline: new Date(+start - 86400000), price: String(item.price),
    capacity: template.capacity, featured: item.featured, isTest: true,
    requireReview: false, allowCancel: true, status: 'open',
    eligibilityRules: { requirePrivacyConsent: true, maxRegistrationsPerUser: 1 },
    fields: [
      { label: '姓名', type: 'text', required: true, sortOrder: 1, options: [] },
      { label: '手机号', type: 'phone', required: true, sortOrder: 2, options: [] }
    ]
  };
}

async function main() {
  const items = JSON.parse(await fs.readFile(path.join(root, 'apps/admin/src/data/local-demo-activities.json'), 'utf8'));
  const templates = JSON.parse(await fs.readFile(path.join(root, 'apps/admin/src/data/activity-starter-pack.json'), 'utf8'));
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ dryRun: true, tenantCode: demoTenantCode, activities: items.map(item => item.title), registrationsCreated: 0, accountsCreated: 0 }));
    return;
  }
  if (root !== '/www/wwwroot/rd.chaimen666.com' || process.env.NODE_ENV !== 'production') throw new Error('Expected production project directory and NODE_ENV.');
  const require = createRequire(path.join(root, 'apps/api/package.json'));
  const database = require('./dist/data-source.js').default;
  assertDemoTarget(database.options, process.env.DEMO_CONFIRM);
  for (const item of items) {
    if (!/^[a-z-]+$/.test(item.id) || !templates.some(template => template.id === item.id)) throw new Error('Invalid demo source.');
    const cover = await fs.readFile(path.join(root, 'uploads/demo-activities', `${item.id}.jpg`));
    if (cover[0] !== 0xff || cover[1] !== 0xd8) throw new Error(`Missing JPEG: ${item.id}`);
  }
  await database.initialize();
  try {
    const result = await database.transaction(async manager => {
      const tenants = manager.getRepository('Tenant');
      const activities = manager.getRepository('Activity');
      const categories = manager.getRepository('ActivityCategory');
      const sections = manager.getRepository('ActivitySection');
      let tenant = await tenants.findOne({ where: { code: demoTenantCode } });
      assertOwnedDemoTenant(tenant);
      if (!tenant) tenant = await tenants.save(tenants.create({ code: demoTenantCode, name: '慢栖演示商家', enabled: true, region: '演示空间', remark: disclosure, settings: { demoContentMarker: demoMarker, packagePlan: 'trial', packageReadOnly: true, registrationReviewEnabled: false, paymentAccountEditable: false, mallEnabled: false } }));
      const existing = await activities.find({ where: { tenant: { id: tenant.id } } });
      const saved = tenant.settings?.demoActivityIds || {};
      if (existing.some(activity => !activity.isTest || !Object.values(saved).includes(activity.id))) throw new Error('Unmanaged activity found in demo merchant; import aborted.');
      const today = new Date(Date.now() + 8 * 3600000);
      const saturday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + ((6 - today.getUTCDay() + 7) % 7 || 7)));
      const records = [];
      for (const item of items) {
        if (saved[item.id]) {
          if (!existing.some(activity => activity.id === saved[item.id])) throw new Error('Recorded demo activity missing; manual review required.');
          records.push({ key: item.id, id: saved[item.id], preserved: true });
          continue;
        }
        let category = await categories.findOne({ where: { tenant: { id: tenant.id }, name: item.category, scene: 'activity' } });
        if (!category) category = await categories.save(categories.create({ tenant, name: item.category, scene: 'activity', enabled: true, publicVisible: true, sortOrder: records.length + 1 }));
        const template = templates.find(template => template.id === item.id);
        const activity = await activities.save(activities.create({ ...demoActivity(item, template, saturday), tenant, category }));
        await sections.save([
          sections.create({ activity, type: 'agenda', title: '当天安排', content: template.agenda, sortOrder: 1 }),
          sections.create({ activity, type: 'rich_text', title: '准备与参与说明', content: `${template.materials}\n\n${disclosure}`, sortOrder: 2 })
        ]);
        saved[item.id] = activity.id;
        records.push({ key: item.id, id: activity.id, preserved: false });
      }
      tenant.settings = { ...tenant.settings, demoActivityIds: saved };
      await tenants.save(tenant);
      await manager.getRepository('AdminOperationLog').save({ adminId: null, adminUsername: 'deployment', adminRole: 'deployment', tenantId: tenant.id, action: 'demo.production.import', targetType: 'tenant', targetId: String(tenant.id), summary: '发布六场独立演示活动，不开放真实报名与支付', detail: { marker: demoMarker, records, registrationsCreated: 0, accountsCreated: 0 } });
      return { tenantId: tenant.id, tenantCode: demoTenantCode, records, registrationsCreated: 0, accountsCreated: 0 };
    });
    console.log(JSON.stringify(result));
  } finally {
    await database.destroy();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
