import { describe, expect, it } from 'vitest';
import { getContainerDatabaseRuntime } from './deploy-database-runtime.mjs';

describe('scoped release database runtime', () => {
  it('does not enable container database access by default', () => {
    expect(getContainerDatabaseRuntime({})).toBe(null);
  });

  it('returns the explicit API container runtime', () => {
    expect(getContainerDatabaseRuntime({
      DB_NETWORK_CONTAINER: 'activity-api',
      DB_RUNTIME_IMAGE: 'rdchaimen666com-api',
    })).toEqual({ container: 'activity-api', image: 'rdchaimen666com-api' });
  });

  it('rejects blank container configuration', () => {
    expect(getContainerDatabaseRuntime({ DB_NETWORK_CONTAINER: '   ' })).toBe(null);
  });
});
