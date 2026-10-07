const ALLOWED_DATABASE_HOSTS = new Set(['127.0.0.1', 'localhost', '172.28.0.1', 'mysql']);

export function isAllowedDatabaseIdentity(options = {}) {
  return options.database === 'reader'
    && ALLOWED_DATABASE_HOSTS.has(String(options.host || ''))
    && Number(options.port) === 3306;
}
