import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, '../../../../../apps/admin/src/components/MarkdownContentEditor.vue'), 'utf8');

describe('nullable historical editor content', () => {
  it('normalizes null content before rendering and editing', () => {
    expect(source).toContain('const sourceText = computed(() => props.modelValue ?? "")');
    expect(source).toContain(':model-value="sourceText"');
    expect(source).toContain('v-if="sourceText.trim()"');
    expect(source).not.toMatch(/props\.modelValue\.(?:trim|length|slice)/);
    expect(source).not.toContain('v-if="modelValue.trim()"');
  });
});
