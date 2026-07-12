import { describe, it, expect } from 'vitest';
import { checkPatterns } from '../../src/pipeline/patterns.js';

describe('checkPatterns', () => {
  const patternList = ['llama_cpp', 'starlite-graphql', 'llm-tools'];

  it('returns CheckReason with severity high for a known pattern', () => {
    const result = checkPatterns('llama_cpp', patternList);
    expect(result).not.toBeNull();
    expect(result!.check).toBe('pattern');
    expect(result!.severity).toBe('high');
    expect(result!.detail).toContain('llama_cpp');
  });

  it('returns null for non-matching name', () => {
    const result = checkPatterns('express', patternList);
    expect(result).toBeNull();
  });

  it('matches case-insensitively', () => {
    const result = checkPatterns('LLAMA_CPP', patternList);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('high');
  });
});
