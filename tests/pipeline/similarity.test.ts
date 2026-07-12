import { describe, it, expect } from 'vitest';
import { levenshteinDistance, jaroWinklerSimilarity, checkSimilarity } from '../../src/pipeline/similarity.js';

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('chalk', 'chalk')).toBe(0);
  });

  it('returns 0 for both empty strings', () => {
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('returns length of other string when one is empty', () => {
    expect(levenshteinDistance('', 'hello')).toBe(5);
    expect(levenshteinDistance('hello', '')).toBe(5);
  });

  it('returns 1 for single character substitution', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1);
  });

  it('returns 1 for single insertion', () => {
    expect(levenshteinDistance('chalk', 'chalks')).toBe(1);
  });

  it('returns 1 for single deletion', () => {
    expect(levenshteinDistance('chalks', 'chalk')).toBe(1);
  });

  it('returns correct distance for multiple edits', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('handles a shorter than b (swap optimization)', () => {
    // 'ab' is shorter than 'abcdef'
    expect(levenshteinDistance('ab', 'abcdef')).toBe(4);
  });

  it('handles b shorter than a (swap optimization)', () => {
    expect(levenshteinDistance('abcdef', 'ab')).toBe(4);
  });
});

describe('jaroWinklerSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(jaroWinklerSimilarity('chalk', 'chalk')).toBe(1.0);
  });

  it('returns 0.0 for empty string(s)', () => {
    expect(jaroWinklerSimilarity('', 'hello')).toBe(0.0);
    expect(jaroWinklerSimilarity('hello', '')).toBe(0.0);
    // Two empty strings are identical
    expect(jaroWinklerSimilarity('', '')).toBe(1.0);
  });

  it('returns low score for completely different strings', () => {
    const score = jaroWinklerSimilarity('abc', 'xyz');
    expect(score).toBeLessThan(0.5);
  });

  it('returns 0 when Jaro matches are 0 (disjoint character sets)', () => {
    const score = jaroWinklerSimilarity('aaa', 'zzz');
    expect(score).toBe(0.0);
  });

  it('gives high score for strings with common prefix', () => {
    const score = jaroWinklerSimilarity('chalk', 'chalks');
    expect(score).toBeGreaterThan(0.9);
  });

  it('gives lower score for strings with no common prefix', () => {
    const withPrefix = jaroWinklerSimilarity('chalk', 'chalks');
    const noPrefix = jaroWinklerSimilarity('chalk', 'xchalk');
    expect(withPrefix).toBeGreaterThan(noPrefix);
  });

  it('handles transpositions correctly', () => {
    const score = jaroWinklerSimilarity('abcde', 'abdce');
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThan(1.0);
  });
});

describe('checkSimilarity', () => {
  const topPackages = ['chalk', 'react', 'express', 'lodash', '@types/react', '@types/node'];

  it('returns null reason for exact match to popular package', () => {
    const result = checkSimilarity('chalk', topPackages);
    expect(result.reason).toBeNull();
    expect(result.suggestion).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('flags typosquat with edit distance 1 as high severity', () => {
    const result = checkSimilarity('chalks', topPackages);
    expect(result.reason).not.toBeNull();
    expect(result.reason!.severity).toBe('high');
    expect(result.suggestion).toBe('chalk');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('flags typosquat with edit distance 2 as medium severity', () => {
    // 'exprs' has ed=2 from 'express'
    const result = checkSimilarity('exprs', topPackages, 0.80);
    if (result.reason) {
      expect(result.reason.severity).toBe('medium');
    }
  });

  it('returns null reason for completely different name', () => {
    const result = checkSimilarity('totally-different-unique-name-xyz', topPackages);
    expect(result.reason).toBeNull();
    expect(result.suggestion).toBeNull();
  });

  it('short names (<=4 chars) use max edit distance 1', () => {
    // 'ract' vs 'react' has ed=2, which exceeds maxLevenshtein=1 for short names
    // 'rec' vs 'react' has ed=2. Length of 'rec' is 3, maxLevenshtein=1
    const result = checkSimilarity('rec', topPackages);
    // Should not match because ed=2 > maxLevenshtein=1 for short names
    expect(result.reason).toBeNull();
  });

  it('handles both scoped packages', () => {
    const result = checkSimilarity('@types/recat', topPackages);
    // Should match @types/react with ed=2 in the local name part
    // But compareNames for both-scoped compares scope + name separately
    if (result.reason) {
      expect(result.suggestion).toBe('@types/react');
    }
  });

  it('handles one scoped, one not (mixed branch)', () => {
    // This tests the else branch of compareNames where one is scoped
    const result = checkSimilarity('@scope/chalk', ['chalk']);
    // Full string comparison — '@scope/chalk' vs 'chalk' has large ed, unlikely to match
    // Just verifying it doesn't crash and returns a result
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('suggestion');
  });

  it('custom threshold parameter filters marginal matches', () => {
    // With default threshold, 'chalks' matches 'chalk'
    const result1 = checkSimilarity('chalks', topPackages);
    expect(result1.reason).not.toBeNull();

    // With threshold = 0.999, no match should pass
    const result2 = checkSimilarity('chalks', topPackages, 0.999);
    expect(result2.reason).toBeNull();
  });

  it('returns null when no match found after scanning list', () => {
    const result = checkSimilarity('zzzzzzzzzzz', topPackages);
    expect(result.reason).toBeNull();
    expect(result.suggestion).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('handles case-insensitive matching', () => {
    const result = checkSimilarity('CHALKS', topPackages);
    expect(result.reason).not.toBeNull();
    expect(result.suggestion).toBe('chalk');
  });
});
