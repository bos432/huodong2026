import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const page = fs.readFileSync(path.resolve(__dirname, '../../../../../apps/mobile/src/pages/admin/home.vue'), 'utf8');
const checkIn = fs.readFileSync(path.resolve(__dirname, '../../../../../apps/mobile/src/pages/admin/check-in.vue'), 'utf8');
const editor = fs.readFileSync(path.resolve(__dirname, '../../../../../apps/mobile/src/pages/admin/activity/edit.vue'), 'utf8');

describe('mobile staff home permissions', () => {
  it('does not request dashboard data for check-in-only staff', () => {
    expect(page).toContain("boot.admin?.permissions?.includes('dashboard.view') ? mobileAdminRequest<any>(\"/admin/dashboard\") : Promise.resolve(null)");
    expect(page).toContain('v-if="canViewDashboard" class="stats"');
    expect(page).toContain('dashboard.value = null');
  });
  it('hides publishing and labels read-only registrations correctly', () => {
    expect(page).toContain('v-if="canWrite" class="action primary"');
    expect(page).toContain("canReviewRegistrations ? '报名审核' : '报名查询'");
    expect(page).not.toContain('MERCHANT CONSOLE');
  });
  it('clears old check-in success and does not treat server rejection as offline mode', () => {
    expect(checkIn).toContain('operationError.value = "";\n  result.value = null;');
    expect(checkIn).toContain('if (err?.statusCode !== undefined) operationError.value = err.message');
    expect(checkIn).toContain('else if (queueOffline(value))');
  });
  it('keeps mobile test flags immutable and sends explicit timestamps', () => {
    expect(editor).toContain('isTest: Boolean(activity.isTest)');
    expect(editor).toContain("if (key === 'isTest' && id.value) return");
    expect(editor).toContain('startTime: new Date(parsedTime(form.value.startTime)).toISOString()');
    expect(editor).toContain("return formatShanghaiDateTime(value, '')");
  });
});
