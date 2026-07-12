import { describe, it, expect } from 'vitest';
import { checkKnownMalicious } from '../../src/pipeline/known-malicious.js';

describe('checkKnownMalicious', () => {
  const maliciousList = ['evil-pkg', 'malware-loader', 'crypto-stealer'];

  it('returns CheckReason with severity critical for a match', () => {
    const result = checkKnownMalicious('evil-pkg', maliciousList);
    expect(result).not.toBeNull();
    expect(result!.check).toBe('known-malicious');
    expect(result!.severity).toBe('critical');
    expect(result!.detail).toContain('evil-pkg');
  });

  it('returns null for no match', () => {
    const result = checkKnownMalicious('safe-pkg', maliciousList);
    expect(result).toBeNull();
  });

  it('matches case-insensitively', () => {
    const result = checkKnownMalicious('EVIL-PKG', maliciousList);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('critical');
  });
});
