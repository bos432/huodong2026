import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
describe('password login does not verify phone ownership', () => {
  it('requires an existing account rather than silently registering a claimed phone', () => {
    const source = readFileSync(join(__dirname, 'public.service.ts'), 'utf8');
    const method = source.slice(source.indexOf('async h5PasswordLogin('), source.indexOf('async myAdminAccess('));
    expect(method).toContain('请先使用验证码注册');
    expect(method).not.toContain('this.users.create(');
    expect(method).toContain('bcrypt.compare(password, user.passwordHash)');
  });
});
