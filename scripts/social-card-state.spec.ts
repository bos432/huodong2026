import { describe, expect, it } from 'vitest';
import { socialCardState } from '../apps/mobile/src/social-card-state';

describe('shared social card', () => {
  it('renders the public contract without a private moderation status', () => {
    expect(socialCardState({ userId: 12, visible: true }, 12)).toEqual({ canPreview: true, canShare: true });
  });
  it('allows only a private preview when the owner hides an approved card', () => {
    expect(socialCardState({ userId: 12, status: 'approved', visible: false }, 0)).toEqual({ canPreview: true, canShare: false });
  });
  it('fails closed for mismatched, hidden, missing or pending cards', () => {
    for (const [profile, id] of [[null, 12], [{ userId: 2, visible: true }, 12], [{ userId: 12, visible: false }, 12], [{ status: 'pending', visible: true }, 0]] as const) {
      expect(socialCardState(profile, id).canShare).toBe(false);
    }
  });
});
