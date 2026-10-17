import { createHash } from 'node:crypto';

export function productionPatchDigest(patch) {
  return createHash('sha256').update(patch).digest('hex');
}
