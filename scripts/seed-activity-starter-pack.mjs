import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'apps/admin/src/data/activity-starter-pack.json'), 'utf8'));
const base = String(process.env.API_BASE || 'http://127.0.0.1:3000/api').replace(/\/$/, '');
const tenantCode = process.env.TENANT_CODE;
const token = process.env.ADMIN_TOKEN;
const apply = process.argv.includes('--apply');
if (!tenantCode) throw new Error('TENANT_CODE is required; no default tenant is selected.');
if (!apply) { console.log(JSON.stringify({ dryRun: true, base, tenantCode, drafts: pack.map(item => item.title) }, null, 2)); process.exit(0); }
if (!token) throw new Error('ADMIN_TOKEN is required for --apply.');
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname) && !process.argv.includes('--allow-remote')) throw new Error('Remote writes require --allow-remote.');
async function request(route, method = 'GET', body) {
  const response = await fetch(`${base}${route}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const json = await response.json();
  if (!response.ok || (json.code !== undefined && ![0, 200, 201].includes(json.code))) throw new Error(`${method} ${route}: ${response.status} ${JSON.stringify(json.message || json.error)}`);
  return json.data ?? json;
}
const options = await request('/admin/activities/options');
const tenant = options.tenants?.find(item => item.code === tenantCode && item.enabled);
if (!tenant) throw new Error(`Target tenant is not available to this account: ${tenantCode}`);
let created = 0;
for (const item of pack) {
  const title = `【策划草稿】${item.title}`;
  const result = await request(`/admin/activities?tenantId=${tenant.id}&keyword=${encodeURIComponent(item.title)}&pageSize=100`);
  const rows = Array.isArray(result) ? result : result.items || [];
  const existing = rows.find(row => row.tenant?.id === tenant.id && (row.title === title || row.title === item.title));
  if (existing && (existing.title !== title || existing.status !== 'draft')) { console.log(`SKIP ${item.id}: already edited`); continue; }
  const start = new Date(); start.setDate(start.getDate() + 30); start.setHours(14, 0, 0, 0);
  const description = `【策划草稿】尚未开放报名。日期为排期占位，场地、带领者、价格须确认。\n\n## 活动介绍\n${item.intro}\n\n## 适合人群\n${item.audience}\n\n## 活动流程\n${item.agenda}\n\n## 参与收获\n${item.outcome}`;
  const row = existing || await request('/admin/activities', 'POST', {
    tenantId: tenant.id, title, description, notice: '尚未开放报名。正式发布前须补充费用包含项目、成团规则、退款期限、取消改期及客服安排。出镜和作品公开须另行征得同意。',
    location: '场地待确认', startTime: start.toISOString(), endTime: new Date(+start + item.durationMinutes * 60000).toISOString(), registrationDeadline: new Date(+start - 86400000).toISOString(),
    capacity: item.capacity, price: 0, status: 'draft', featured: false, requireReview: false, allowCancel: true,
    fields: [{ label: '姓名', type: 'text', required: true, sortOrder: 1, options: [] }, { label: '手机号', type: 'phone', required: true, sortOrder: 2, options: [] }],
    hosts: [], sections: [{ type: 'agenda', title: '活动流程', content: item.agenda, sortOrder: 1 }]
  });
  const operation = await request(`/admin/activities/${row.id}/operation`);
  if (operation.revision === 0) await request(`/admin/activities/${row.id}/operation`, 'PUT', { revision: 0, plan: {
    mode: 'self', owner: '', budgetFen: 0, targetRevenueFen: 0, entries: [],
    checklist: ['确认负责人和场地', '确认实际日期并移除草稿占位', '确认价格和费用包含项目', '上传有权使用的封面', '确定成团与退款规则', '检查通知与签到', '确认安全安排', '活动后反馈与跟进'].map(label => ({ label, done: false })),
    note: `策划编号：${item.id}\n${item.priceSuggestion}\n物料与交付准备：${item.materials}\n后续运营：${item.next}\n零元仅为草稿占位，不代表正式免费活动。`
  } });
  console.log(`${existing ? 'EXISTS' : 'CREATED'} draft ${row.id}: ${title}`); if (!existing) created++;
}
console.log(JSON.stringify({ tenantCode, created, published: 0, registrationsCreated: 0 }));
