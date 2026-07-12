import { describe, it, expect } from 'vitest';
import { checkPopular } from '../../src/pipeline/popular.js';

describe('checkPopular', () => {
  const topPackages = ['express', 'react', 'lodash', 'chalk'];

  it('returns CheckReason with severity info for a popular package', () => {
    const result = checkPopular('express', topPackages);
    expect(result).not.toBeNull();
    expect(result!.check).toBe('popular');
    expect(result!.severity).toBe('info');
    expect(result!.detail).toContain('express');
  });

  it('returns null for an unknown package', () => {
    const result = checkPopular('totally-unknown-pkg', topPackages);
    expect(result).toBeNull();
  });

  it('matches case-insensitively', () => {
    const result = checkPopular('EXPRESS', topPackages);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('info');
  });
});
