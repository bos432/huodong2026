const ALLOWED_DATABASE_IDENTITIES = [
  { database: 'reader', host: '127.0.0.1', port: 3306 },
  { database: 'reader', host: 'localhost', port: 3306 },
  { database: 'reader', host: '172.28.0.1', port: 3306 },
  { database: 'reader', host: 'mysql', port: 3306 },
  { database: 'activity_registration', host: '127.0.0.1', port: 13306 },
];

export function isAllowedDatabaseIdentity(options = {}) {
  return ALLOWED_DATABASE_IDENTITIES.some((identity) => (
    identity.database === options.database
      && identity.host === String(options.host || '')
      && identity.port === Number(options.port)
  ));
}
