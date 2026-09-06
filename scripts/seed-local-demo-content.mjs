import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'http://127.0.0.1:3010/api';
const tenantCode = 'local-review-20260906';
const items = JSON.parse(await fs.readFile(path.join(root, 'apps/admin/src/data/local-demo-activities.json'), 'utf8'));
const templates = JSON.parse(await fs.readFile(path.join(root, 'apps/admin/src/data/activity-starter-pack.json'), 'utf8'));
const local = path.join(root, '.local-logs/operations-20260905');
const manifestPath = path.join(local, 'demo-content-manifest.json');
const disclosure = '演示活动：仅供本地产品体验，不代表真实举办安排。价格为示例，请勿付款或前往虚拟场地。封面为公开样图，不是活动现场照片。';
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ dryRun: true, base, tenantCode, activities: items.map(item => ({ title: item.title, category: item.category, price: item.price })) }, null, 2));
  process.exit(0);
}

async function request(route, token, method = 'GET', data) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(30000) });
  const body = await response.json();
  if (!response.ok || body.code !== 0) throw new Error(`${method} ${route}: ${body.message || response.status}`);
  return body.data;
}

const state = JSON.parse(await fs.readFile(path.join(local, 'runtime.json'), 'utf8'));
if (state.reviewAcceptance?.tenantCode !== tenantCode || state.reviewAcceptance.tenantId !== 6) throw new Error('Unexpected local demo tenant; no writes performed.');
const platform = await request('/admin/auth/login', null, 'POST', { username: state.adminUsername, password: state.adminPassword });
const config = await request('/admin/system/config-check', platform.token);
if (config.environment !== 'development') throw new Error('Demo seeding is restricted to the local development environment.');
const merchant = await request('/admin/auth/login', null, 'POST', { username: state.reviewAcceptance.adminUsername, password: state.reviewAcceptance.password });
if (merchant.admin?.tenantId !== 6 || merchant.admin.tenant?.code !== tenantCode) throw new Error('Demo account tenant mismatch.');
let manifest;
try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; manifest = { tenantId: 6, tenantCode, activities: [] }; }
if (manifest.tenantId !== 6 || manifest.tenantCode !== tenantCode) throw new Error('Existing demo manifest belongs to another tenant.');
const categories = await request('/admin/categories', merchant.token);
const imageDir = path.join(root, 'uploads/demo-activities');
await fs.mkdir(imageDir, { recursive: true });
const chinaToday = new Date(Date.now() + 8 * 3600000);
const saturday = new Date(Date.UTC(chinaToday.getUTCFullYear(), chinaToday.getUTCMonth(), chinaToday.getUTCDate() + ((6 - chinaToday.getUTCDay() + 7) % 7 || 7)));

for (const item of items) {
  if (!/^[a-z-]+$/.test(item.id)) throw new Error('Invalid demo asset identifier.');
  const template = templates.find(template => template.id === item.id);
  if (!template) throw new Error(`Template missing: ${item.id}`);
  const imagePath = path.join(imageDir, `${item.id}.jpg`);
  try { await fs.access(imagePath); }
  catch {
    const response = await fetch(item.image, { signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/jpeg')) throw new Error(`Image unavailable: ${item.id}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`Invalid image: ${item.id}`);
    await fs.writeFile(imagePath, bytes, { flag: 'wx' });
  }
  let category = categories.find(category => category.name === item.category && category.tenant?.id === 6);
  if (!category) {
    category = await request('/admin/categories', merchant.token, 'POST', { name: item.category, scene: 'activity', sortOrder: categories.length + 1, enabled: true, publicVisible: true });
    categories.push(category);
  }
  const saved = manifest.activities.find(record => record.key === item.id);
  const existing = await request(`/admin/activities?keyword=${encodeURIComponent(item.title)}&pageSize=100`, merchant.token);
  let activity = saved ? await request(`/admin/activities/${saved.id}`, merchant.token) : existing.items.find(activity => activity.title === item.title);
  if (activity && (!activity.isTest || activity.tenant?.id !== 6)) throw new Error(`Existing activity is not an owned test record: ${item.title}`);
  if (saved && activity.title !== item.title) { console.log(`PRESERVED edited demo ${activity.id}`); continue; }
  if (!activity) {
    const date = new Date(+saturday + item.dayOffset * 86400000).toISOString().slice(0, 10);
    const start = new Date(`${date}T${item.time}:00+08:00`);
    activity = await request('/admin/activities', merchant.token, 'POST', {
      title: item.title, categoryId: category.id, coverUrl: `/uploads/demo-activities/${item.id}.jpg`,
      description: `${disclosure}\n\n## 活动介绍\n${item.intro || template.intro}\n\n## 适合谁\n${template.audience}\n\n## 可以带走什么\n${template.outcome}`,
      notice: `${disclosure}\n\n示例约定：提前10分钟到场；活动前可取消报名，付款后的退款以提交前展示规则为准。照片和作品公开使用须另行征得本人同意。请自备所需个人用品，尊重其他参与者的表达。`,
      location: item.location, locationCity: '本地测试', startTime: start.toISOString(), endTime: new Date(+start + template.durationMinutes * 60000).toISOString(), registrationDeadline: new Date(+start - 24 * 3600000).toISOString(),
      price: item.price, capacity: template.capacity, featured: item.featured, isTest: true, requireReview: false, allowCancel: true, status: 'draft',
      fields: [{ label: '姓名', type: 'text', required: true, sortOrder: 1, options: [] }, { label: '手机号', type: 'phone', required: true, sortOrder: 2, options: [] }, { label: '备注', type: 'remark', required: false, sortOrder: 3, options: [] }],
      hosts: [], sections: [{ type: 'agenda', title: '当天安排', content: template.agenda, sortOrder: 1 }, { type: 'rich_text', title: '准备与参与说明', content: `${template.materials}\n\n${disclosure}`, sortOrder: 2 }],
      eligibilityRules: { requirePrivacyConsent: true, maxRegistrationsPerUser: 1 }
    });
  }
  if (!saved) { manifest.activities.push({ key: item.id, id: activity.id, title: activity.title, imageSource: item.image, coverUrl: activity.coverUrl }); await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2)); }
  if (activity.status === 'draft') activity = await request(`/admin/activities/${activity.id}/submit-approval`, merchant.token, 'POST', {});
  if (activity.status === 'pending_approval') activity = await request(`/admin/activities/${activity.id}/approve`, platform.token, 'POST', { remark: '本地演示内容，仅用于产品体验，不代表真实举办安排。' });
  console.log(`${activity.status.toUpperCase()} ${activity.id}: ${activity.title}`);
}
console.log(JSON.stringify({ tenantCode, activityIds: manifest.activities.map(item => item.id), registrationsCreated: 0, reviewsCreated: 0, manifest: manifestPath }));
