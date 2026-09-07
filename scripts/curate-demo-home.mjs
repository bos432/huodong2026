import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const homeMarker = 'prototype-images-20260907';
export const demoHomeSections = [
  { type: 'featured_activities', title: '本周推荐', sortOrder: 20, config: { source: 'featured', display: 'lead_rail', limit: 1, demoHomeMarker: homeMarker } },
  { type: 'activity_feed', title: '近期活动', sortOrder: 40, config: { limit: 6, showEnded: false, demoHomeMarker: homeMarker } }
];
export function assertDemoHomeOwnership(tenant, activities, sections) {
  if (tenant?.code !== 'manpi-demo' || tenant.settings?.demoContentMarker !== 'production-demo-20260906-v1') throw new Error('Not the owned demonstration merchant.');
  const ids = Object.values(tenant.settings.demoActivityIds || {});
  if (activities.length !== 6 || ids.length !== 6 || activities.some(activity => !activity.isTest || !ids.includes(activity.id) || activity.tenant?.id !== tenant.id)) throw new Error('Unexpected demonstration activities.');
  if (sections.some(section => section.config?.demoHomeMarker !== homeMarker)) throw new Error('Merchant has custom homepage content; do not overwrite.');
}

async function main() {
  if (!process.argv.includes('--apply')) { console.log(JSON.stringify({ dryRun: true, merchant: 'manpi-demo', sections: demoHomeSections, primaryCover: '/uploads/demo-activities/tea-table.jpg' })); return; }
  const root = '/www/wwwroot/rd.chaimen666.com';
  if (process.cwd() !== root || process.env.DEMO_HOME_CONFIRM !== 'reader/manpi-demo/prototype-images') throw new Error('Explicit production demo confirmation required.');
  const backup = path.resolve(process.env.DEMO_HOME_BACKUP || '');
  if (!backup.startsWith('/www/backup/activity-releases/') || !backup.endsWith('/demo-home-before.json')) throw new Error('Expected private demonstration backup path.');
  const require = createRequire(path.join(root, 'apps/api/package.json'));
  const database = require('./dist/data-source.js').default;
  const { homepagePublicationScopeKey } = require('./dist/shared/homepage-publication.js');
  if (database.options.database !== 'reader' || database.options.host !== '127.0.0.1' || Number(database.options.port) !== 3306) throw new Error('Unexpected database.');
  await database.initialize();
  try {
    const result = await database.transaction(async manager => {
      const tenant = await manager.getRepository('Tenant').findOneBy({ code: 'manpi-demo' });
      if (!tenant) throw new Error('Demonstration merchant missing.');
      const activities = await manager.getRepository('Activity').find({ where: { tenant: { id: tenant.id } } });
      const sections = await manager.getRepository('HomepageSection').find({ where: { tenant: { id: tenant.id }, pageKey: 'home' } });
      assertDemoHomeOwnership(tenant, activities, sections);
      const publication = await manager.getRepository('HomepagePublication').findOneBy({ tenantScopeKey: homepagePublicationScopeKey(tenant.id), pageKey: 'home' });
      if (publication) throw new Error('Published custom homepage exists; manual review required.');
      const lead = activities.find(activity => activity.coverUrl === '/uploads/demo-activities/tea-table.jpg');
      if (!lead) throw new Error('Expected tea activity is missing.');
      await fs.writeFile(backup, JSON.stringify({ tenantId: tenant.id, featured: activities.map(activity => ({ id: activity.id, featured: activity.featured })), sections }, null, 2), { mode: 0o600, flag: 'wx' });
      for (const activity of activities) await manager.getRepository('Activity').update({ id: activity.id, tenant: { id: tenant.id } }, { featured: activity.id === lead.id });
      const repository = manager.getRepository('HomepageSection');
      for (const definition of demoHomeSections) {
        const existing = sections.find(section => section.type === definition.type);
        await repository.save(repository.create({ ...existing, ...definition, tenant, pageKey: 'home', subtitle: '', enabled: true }));
      }
      await manager.getRepository('AdminOperationLog').save({ adminId: null, adminUsername: 'deployment', adminRole: 'deployment', tenantId: tenant.id, action: 'demo.home.curate', targetType: 'tenant', targetId: String(tenant.id), summary: '演示首页采用茶事主图与活动小图组合', detail: { marker: homeMarker, leadActivityId: lead.id, backup } });
      return { tenantId: tenant.id, leadActivityId: lead.id, preservedActivityIds: activities.map(activity => activity.id), backup };
    });
    console.log(JSON.stringify(result));
  } finally { await database.destroy(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
