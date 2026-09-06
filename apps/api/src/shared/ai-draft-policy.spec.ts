import { describe, expect, it } from 'vitest';
import { aiDraftHash, aiDraftInput, aiDraftSnapshot, aiEndpoint, redactDraftText } from './ai-draft-policy';
describe('AI draft boundaries', () => {
  it('only sends approved fields rather than registration and payment credentials', () => {
    const snapshot = aiDraftSnapshot({ id: 1, title: '活动', price: '49.00', description: '联系 13812345678 test@example.com', participants: ['private'], groupQrCodeUrl: 'private', password: 'secret' }, aiDraftInput({ mode: 'reply', question: 'Bearer abcdef0123456789' }));
    const text = JSON.stringify(snapshot);
    expect(text).not.toContain('13812345678'); expect(text).not.toContain('test@example.com'); expect(text).not.toContain('abcdef0123456789'); expect(text).not.toContain('private'); expect(text).not.toContain('secret');
    expect(aiDraftHash(snapshot)).toHaveLength(64);
  });
  it('requires explicitly allowed local mocks and never permits them in production', () => {
    expect(aiEndpoint('http://127.0.0.1:1234/v1', 'development', true).simulation).toBe(true);
    expect(() => aiEndpoint('http://127.0.0.1:1234', 'production', true)).toThrow();
    expect(() => aiEndpoint('https://u:p@example.com', 'production', false)).toThrow();
    expect(() => aiEndpoint('https://example.com?key=secret', 'production', false)).toThrow();
    expect(aiEndpoint('https://api.example.com/v1', 'production', false).url).toBe('https://api.example.com/v1/chat/completions');
  });
  it('rejects arbitrary modes and limits outgoing text', () => {
    expect(() => aiDraftInput({ mode: 'execute', question: '' })).toThrow();
    expect(redactDraftText('x'.repeat(5000))).toHaveLength(3000);
  });
});
