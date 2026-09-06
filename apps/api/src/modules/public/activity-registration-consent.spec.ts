import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.resolve(__dirname, '../../../../../apps/mobile/src/pages/activity/register.vue'), 'utf8');

describe('activity registration consent', () => {
  it('starts unchecked and validates consent before submitting', () => {
    expect(source).toContain('const privacyAccepted = ref(false)');
    expect(source).toContain('requirePrivacyConsent && !privacyAccepted.value');
    expect(source).toContain('privacyAccepted: privacyAccepted.value');
  });
  it('uses actual checkbox state for H5 and checkbox-group changes for mini programs', () => {
    expect(source).toContain('@change="privacyAccepted = $event.target.checked"');
    expect(source).toContain('<checkbox-group @change="privacyAccepted = $event.detail.value.includes(\'accepted\')">');
    expect(source).toContain('<checkbox value="accepted" :checked="privacyAccepted"');
    expect(source).not.toContain('@change="privacyAccepted = !privacyAccepted"');
  });
});
