import { describe, expect, it } from 'vitest';
import { isAllowedDatabaseIdentity } from './deploy-database-identity.mjs';

describe('scoped release database identity', () => {
  it('allows the production Docker gateway for the reader database', () => {
    expect(isAllowedDatabaseIdentity({ database: 'reader', host: '172.28.0.1', port: 3306 })).toBe(true);
  });

  it('rejects other databases, hosts, and ports', () => {
    expect(isAllowedDatabaseIdentity({ database: 'reader', host: '10.0.0.8', port: 3306 })).toBe(false);
    expect(isAllowedDatabaseIdentity({ database: 'activity_registration', host: '127.0.0.1', port: 3306 })).toBe(false);
    expect(isAllowedDatabaseIdentity({ database: 'reader', host: '127.0.0.1', port: 3307 })).toBe(false);
  });
});
