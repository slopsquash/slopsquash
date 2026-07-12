import { describe, it, expect, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { CacheStore } from '../../src/cache/store.js';
import type { RegistryCacheEntry } from '../../src/types.js';

let tempDir: string;

function makeTempDir(): string {
  const dir = join(tmpdir(), `slopsquash-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

afterEach(() => {
  if (tempDir) {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
});

const freshEntry: RegistryCacheEntry = {
  exists: true,
  publishedAt: '2020-01-01T00:00:00Z',
  downloads: 1000,
  checkedAt: new Date().toISOString(),
};

const staleEntry: RegistryCacheEntry = {
  exists: true,
  publishedAt: '2020-01-01T00:00:00Z',
  downloads: 1000,
  checkedAt: '2000-01-01T00:00:00Z', // very old
};

describe('CacheStore', () => {
  it('get() returns undefined for unknown keys', () => {
    tempDir = makeTempDir();
    const store = new CacheStore(tempDir);
    expect(store.get('nonexistent')).toBeUndefined();
  });

  it('set() + get() round-trips correctly', () => {
    tempDir = makeTempDir();
    const store = new CacheStore(tempDir);
    store.set('my-package', freshEntry);
    const result = store.get('my-package');
    expect(result).toEqual(freshEntry);
  });

  it('isFresh() returns false for unknown keys', () => {
    tempDir = makeTempDir();
    const store = new CacheStore(tempDir);
    expect(store.isFresh('unknown')).toBe(false);
  });

  it('isFresh() returns true for fresh entries', () => {
    tempDir = makeTempDir();
    const store = new CacheStore(tempDir);
    store.set('fresh-pkg', freshEntry);
    expect(store.isFresh('fresh-pkg')).toBe(true);
  });

  it('isFresh() returns false for expired entries', () => {
    tempDir = makeTempDir();
    const store = new CacheStore(tempDir);
    store.set('stale-pkg', staleEntry);
    expect(store.isFresh('stale-pkg')).toBe(false);
  });

  it('flush() writes to disk and new instance reads it back', () => {
    tempDir = makeTempDir();
    const store1 = new CacheStore(tempDir);
    store1.set('persisted-pkg', freshEntry);
    store1.flush();

    const store2 = new CacheStore(tempDir);
    const result = store2.get('persisted-pkg');
    expect(result).toEqual(freshEntry);
  });

  it('handles missing cache file on load', () => {
    tempDir = makeTempDir();
    // No cache.json exists in tempDir
    const store = new CacheStore(tempDir);
    expect(store.get('anything')).toBeUndefined();
  });

  it('handles malformed cache file on load', () => {
    tempDir = makeTempDir();
    writeFileSync(join(tempDir, 'cache.json'), 'NOT JSON {{{{');
    const store = new CacheStore(tempDir);
    // Should fall back to empty
    expect(store.get('anything')).toBeUndefined();
  });

  it('normalizes keys to lowercase', () => {
    tempDir = makeTempDir();
    const store = new CacheStore(tempDir);
    store.set('MyPackage', freshEntry);
    expect(store.get('mypackage')).toEqual(freshEntry);
  });

  it('flush() is a no-op when no changes have been made', () => {
    tempDir = makeTempDir();
    const store = new CacheStore(tempDir);
    store.flush(); // should not throw
  });
});
