import { describe, it, expect } from 'vitest';
import { loadTopPackages, loadSlopsquatPatterns, loadKnownMalicious } from '../../src/data/loader.js';

describe('loadTopPackages', () => {
  it('returns a non-empty string array for npm', () => {
    const pkgs = loadTopPackages('npm');
    expect(Array.isArray(pkgs)).toBe(true);
    expect(pkgs.length).toBeGreaterThan(0);
    expect(typeof pkgs[0]).toBe('string');
  });

  it('returns a non-empty string array for pypi', () => {
    const pkgs = loadTopPackages('pypi');
    expect(Array.isArray(pkgs)).toBe(true);
    expect(pkgs.length).toBeGreaterThan(0);
  });

  it('caches npm results (same reference on second call)', () => {
    const first = loadTopPackages('npm');
    const second = loadTopPackages('npm');
    expect(first).toBe(second);
  });

  it('caches pypi results (same reference on second call)', () => {
    const first = loadTopPackages('pypi');
    const second = loadTopPackages('pypi');
    expect(first).toBe(second);
  });
});

describe('loadSlopsquatPatterns', () => {
  it('returns a non-empty string array', () => {
    const patterns = loadSlopsquatPatterns();
    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns).toContain('llama_cpp');
  });

  it('caches results', () => {
    const first = loadSlopsquatPatterns();
    const second = loadSlopsquatPatterns();
    expect(first).toBe(second);
  });
});

describe('loadKnownMalicious', () => {
  it('returns an array for npm', () => {
    const list = loadKnownMalicious('npm');
    expect(Array.isArray(list)).toBe(true);
  });

  it('returns an array for pypi', () => {
    const list = loadKnownMalicious('pypi');
    expect(Array.isArray(list)).toBe(true);
  });

  it('caches npm results', () => {
    const first = loadKnownMalicious('npm');
    const second = loadKnownMalicious('npm');
    expect(first).toBe(second);
  });

  it('caches pypi results', () => {
    const first = loadKnownMalicious('pypi');
    const second = loadKnownMalicious('pypi');
    expect(first).toBe(second);
  });
});
