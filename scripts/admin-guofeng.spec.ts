import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const layout = readFileSync('apps/admin/src/views/Layout.vue', 'utf8');
const activities = readFileSync('apps/admin/src/views/Activities.vue', 'utf8');
const styles = readFileSync('apps/admin/src/styles.css', 'utf8');

describe('admin guofeng presentation contracts', () => {
  it('uses the same light menu palette on desktop and mobile without fixed header height', () => {
    expect(layout.match(/background-color="#f7f9f5"/g)).toHaveLength(2);
    expect(layout).not.toContain('#162033');
    expect(layout).toContain('.header { height: auto;');
    expect(layout).toContain('visibleMenuGroups');
    expect(layout).toContain('canShowMenuItem(item)');
  });
  it('provides names for compact account actions and hides decorative five-element text', () => {
    for (const label of ['修改密码', '退出登录']) expect(layout).toContain(`aria-label="${label}"`);
    expect(layout).toContain('class="five-elements" aria-hidden="true"');
    expect(styles).toContain('letter-spacing: 0');
  });
  it('keeps filters and privileged actions while making additional columns opt-in', () => {
    expect(activities).toContain('const showExtendedColumns = ref(false)');
    expect(activities).toContain('v-model="showExtendedColumns"');
    expect(activities).toContain(':aria-pressed="item.active"');
    expect(activities).toContain('@click="setStatusFilter(item.value)"');
    expect(activities).toContain('canOperateActivities && !isPlatformAdmin()');
    expect(activities).toContain('canApprove(row)');
    expect(activities).toContain('v-if="row.isTest"');
    expect(activities).toContain('class="activity-thumbnail"');
  });
});
