import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { productionPatchDigest } from './deploy-patch.mjs';

test('production patch digest preserves trailing newline bytes', () => {
  const patch = Buffer.from('diff --git a/file b/file\n+content\n');
  assert.equal(productionPatchDigest(patch), createHash('sha256').update(patch).digest('hex'));
  assert.notEqual(productionPatchDigest(patch), createHash('sha256').update(patch.toString('utf8').trim()).digest('hex'));
});

test('empty production patch has the standard empty-buffer digest', () => {
  assert.equal(productionPatchDigest(Buffer.alloc(0)), createHash('sha256').update(Buffer.alloc(0)).digest('hex'));
});
