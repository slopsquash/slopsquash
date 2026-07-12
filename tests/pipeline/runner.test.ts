import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { checkPackage, checkPackages } from '../../src/pipeline/runner.js';
import * as loader from '../../src/data/loader.js';

let tempDir: string;

function makeTempDir(): string {
  const dir = join(tmpdir(), `slopsquash-runner-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function mockFetch404() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    status: 404,
    ok: false,
  }));
}

function mockFetchOldPackage() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    status: 200,
    ok: true,
    json: async () => ({ time: { created: '2020-01-01T00:00:00Z' } }),
  }));
}

function mockFetchNewPackage() {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    status: 200,
    ok: true,
    json: async () => ({ time: { created: twoDaysAgo } }),
  }));
}

function mockFetchMediumPackage() {
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    status: 200,
    ok: true,
    json: async () => ({ time: { created: fifteenDaysAgo } }),
  }));
}

beforeEach(() => {
  tempDir = makeTempDir();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
});

describe('checkPackage', () => {
  it('allows allowlisted packages', async () => {
    mockFetchOldPackage();
    const result = await checkPackage('my-custom-pkg', 'npm', { allowlist: ['my-custom-pkg'], cacheDir: tempDir });
    expect(result.verdict).toBe('allow');
    expect(result.reasons[0].check).toBe('allowlist');
    expect(result.confidence).toBe(1.0);
  });

  it('blocks blocklisted packages', async () => {
    mockFetchOldPackage();
    const result = await checkPackage('bad-pkg', 'npm', { blocklist: ['bad-pkg'], cacheDir: tempDir });
    expect(result.verdict).toBe('block');
    expect(result.reasons[0].check).toBe('blocklist');
    expect(result.confidence).toBe(1.0);
  });

  it('allows known popular packages', async () => {
    mockFetchOldPackage();
    const result = await checkPackage('express', 'npm', { cacheDir: tempDir });
    expect(result.verdict).toBe('allow');
    expect(result.reasons[0].check).toBe('popular');
  });

  it('blocks known malicious packages', async () => {
    const spy = vi.spyOn(loader, 'loadKnownMalicious').mockReturnValue(['crossenv']);
    // Requires no fetch because it's blocked in stage 1
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await checkPackage('crossenv', 'npm', { cacheDir: tempDir });
    expect(result.verdict).toBe('block');
    expect(result.reasons[0].check).toBe('known-malicious');
    expect(fetchMock).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('detects typosquats via similarity', async () => {
    mockFetchOldPackage();
    const result = await checkPackage('chalks', 'npm', { cacheDir: tempDir });
    expect(['block', 'warn']).toContain(result.verdict);
    expect(result.suggestion).toBe('chalk');
    expect(result.reasons.some(r => r.check === 'similarity')).toBe(true);
  });

  it('detects hallucinated package names via patterns', async () => {
    mockFetch404();
    const result = await checkPackage('llama_cpp', 'pypi', { cacheDir: tempDir });
    expect(result.verdict).toBe('block');
    expect(result.reasons.some(r => r.check === 'pattern')).toBe(true);
  });

  it('includes registry reason when package not found', async () => {
    mockFetch404();
    const result = await checkPackage('xyzzy-nonexistent-pkg-abc', 'npm', { cacheDir: tempDir });
    expect(result.reasons.some(r => r.check === 'registry')).toBe(true);
  });

  it('includes registry reason for new packages', async () => {
    mockFetchNewPackage();
    const result = await checkPackage('xyzzy-brand-new-abc', 'npm', { cacheDir: tempDir });
    expect(result.reasons.some(r => r.check === 'registry' && r.severity === 'medium')).toBe(true);
  });

  it('skips registry check when networkEnabled is false', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await checkPackage('xyzzy-nonexistent-pkg-abc', 'npm', { networkEnabled: false, cacheDir: tempDir });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.reasons.every(r => r.check !== 'registry')).toBe(true);
  });

  it('cache hit: missing package from cache still produces registry warning', async () => {
    mockFetch404();
    // First call caches the 404
    await checkPackage('cached-missing-pkg', 'npm', { cacheDir: tempDir });
    // Second call should use cache and still produce warning
    const result = await checkPackage('cached-missing-pkg', 'npm', { cacheDir: tempDir });
    expect(result.reasons.some(r => r.check === 'registry' && r.detail.includes('not found'))).toBe(true);
  });

  it('cache hit: young package from cache still produces age warning', async () => {
    mockFetchNewPackage();
    await checkPackage('cached-young-pkg', 'npm', { cacheDir: tempDir });
    const result = await checkPackage('cached-young-pkg', 'npm', { cacheDir: tempDir });
    expect(result.reasons.some(r => r.check === 'registry' && r.detail.includes('day'))).toBe(true);
  });

  it('cache hit: medium-age package from cache produces age warning', async () => {
    mockFetchMediumPackage();
    await checkPackage('cached-medium-pkg', 'npm', { cacheDir: tempDir });
    const result = await checkPackage('cached-medium-pkg', 'npm', { cacheDir: tempDir });
    expect(result.reasons.some(r => r.check === 'registry' && r.severity === 'low')).toBe(true);
  });

  it('defaultAction warn downgrades verdict', async () => {
    mockFetchOldPackage();
    const result = await checkPackage('chalks', 'npm', { defaultAction: 'warn', cacheDir: tempDir });
    // Similarity is high severity, so verdict uses config.defaultAction
    expect(result.verdict).toBe('warn');
  });

  it('medium severity reasons produce warn verdict', async () => {
    mockFetch404();
    // A name that only triggers registry (medium), not similarity or patterns
    const result = await checkPackage('xyzzy-unique-no-sim-abc', 'npm', { cacheDir: tempDir });
    if (result.reasons.some(r => r.severity === 'medium') && !result.reasons.some(r => r.severity === 'high' || r.severity === 'critical')) {
      expect(result.verdict).toBe('warn');
    }
  });

  it('allowlist is case-insensitive', async () => {
    mockFetchOldPackage();
    const result = await checkPackage('MY-PKG', 'npm', { allowlist: ['my-pkg'], cacheDir: tempDir });
    expect(result.verdict).toBe('allow');
    expect(result.reasons[0].check).toBe('allowlist');
  });

  it('blocklist is case-insensitive', async () => {
    mockFetchOldPackage();
    const result = await checkPackage('BAD-PKG', 'npm', { blocklist: ['bad-pkg'], cacheDir: tempDir });
    expect(result.verdict).toBe('block');
    expect(result.reasons[0].check).toBe('blocklist');
  });
});

describe('checkPackages', () => {
  it('batch checks return array with correct verdicts', async () => {
    mockFetchOldPackage();
    const results = await checkPackages(['express', 'chalks'], 'npm', { cacheDir: tempDir });
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('express');
    expect(results[0].verdict).toBe('allow');
    expect(results[1].name).toBe('chalks');
    expect(['block', 'warn']).toContain(results[1].verdict);
  });
});
