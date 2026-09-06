type Host = { name?: string | null; title?: string | null; bio?: string | null; avatarUrl?: string | null };

// Exact legacy startup-seed fingerprint. Keep the record for operators to review,
// but never present the automatically generated biography as verified evidence.
export function isLegacySeedHost(host: Host) {
  return host.name === '林知夏' && host.title === '活动主理人' && !host.avatarUrl
    && host.bio === '长期策划读书会和创作者线下活动，关注知识分享与社群连接。';
}
