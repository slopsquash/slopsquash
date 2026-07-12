import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRegistry } from '../../src/pipeline/registry.js';

describe('checkRegistry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns reason for 404 (package not found)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
    }));
    const result = await checkRegistry('nonexistent-pkg', 'npm');
    expect(result.reason).not.toBeNull();
    expect(result.reason!.severity).toBe('medium');
    expect(result.reason!.detail).toContain('not found');
    expect(result.cacheEntry.exists).toBe(false);
  });

  it('returns null reason for non-404 error (e.g. 500)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
    }));
    const result = await checkRegistry('some-pkg', 'npm');
    expect(result.reason).toBeNull();
    expect(result.cacheEntry.exists).toBe(false);
  });

  it('returns null reason for old npm package (>30 days)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ time: { created: '2020-01-01T00:00:00Z' } }),
    }));
    const result = await checkRegistry('old-pkg', 'npm');
    expect(result.reason).toBeNull();
    expect(result.cacheEntry.exists).toBe(true);
    expect(result.cacheEntry.publishedAt).toBe('2020-01-01T00:00:00Z');
  });

  it('returns medium severity for brand new npm package (<7 days)', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ time: { created: twoDaysAgo } }),
    }));
    const result = await checkRegistry('new-pkg', 'npm');
    expect(result.reason).not.toBeNull();
    expect(result.reason!.severity).toBe('medium');
    expect(result.reason!.detail).toContain('day(s) ago');
  });

  it('returns low severity for medium-age npm package (7-30 days)', async () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ time: { created: fifteenDaysAgo } }),
    }));
    const result = await checkRegistry('medium-pkg', 'npm');
    expect(result.reason).not.toBeNull();
    expect(result.reason!.severity).toBe('low');
    expect(result.reason!.detail).toContain('days ago');
  });

  it('returns null reason when no time.created field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ time: undefined }),
    }));
    const result = await checkRegistry('no-time-pkg', 'npm');
    expect(result.reason).toBeNull();
    expect(result.cacheEntry.exists).toBe(true);
  });

  it('handles pypi package with releases (picks earliest date)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        releases: {
          '1.0': [
            { upload_time: '2020-06-01' },
            { upload_time: '2020-05-01' } // earlier!
          ],
          '2.0': [{ upload_time: '2019-03-15' }],
        },
      }),
    }));
    const result = await checkRegistry('pypi-pkg', 'pypi');
    expect(result.reason).toBeNull(); // old package
    expect(result.cacheEntry.exists).toBe(true);
    expect(result.cacheEntry.publishedAt).toBe('2019-03-15');
  });

  it('returns medium severity for brand new pypi package', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        releases: {
          '0.1.0': [{ upload_time: twoDaysAgo }],
        },
      }),
    }));
    const result = await checkRegistry('new-pypi-pkg', 'pypi');
    expect(result.reason).not.toBeNull();
    expect(result.reason!.severity).toBe('medium');
  });

  it('returns null reason on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const result = await checkRegistry('error-pkg', 'npm');
    expect(result.reason).toBeNull();
    expect(result.cacheEntry.exists).toBe(false);
  });

  it('returns null reason on abort/timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));
    const result = await checkRegistry('timeout-pkg', 'npm');
    expect(result.reason).toBeNull();
    expect(result.cacheEntry.exists).toBe(false);
  });
});
