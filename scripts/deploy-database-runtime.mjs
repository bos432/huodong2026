export function getContainerDatabaseRuntime(options = {}) {
  const container = String(options.DB_NETWORK_CONTAINER || '').trim();
  if (!container) return null;
  return {
    container,
    image: String(options.DB_RUNTIME_IMAGE || 'rdchaimen666com-api').trim() || 'rdchaimen666com-api',
  };
}
