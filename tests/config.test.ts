import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock 'fs' and 'os' BEFORE importing config.ts
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return {
    ...actual,
    homedir: vi.fn(() => '/fake/home'),
  };
});

import { existsSync, readFileSync } from 'fs';
import { loadConfig } from '../src/config.js';

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('loadConfig', () => {
  it('returns correct defaults when no config file exists', () => {
    mockExistsSync.mockReturnValue(false);
    const config = loadConfig();
    expect(config.defaultAction).toBe('block');
    expect(config.allowlist).toEqual([]);
    expect(config.blocklist).toEqual([]);
    expect(config.networkEnabled).toBe(true);
    expect(config.networkTimeoutMs).toBe(3000);
    expect(config.cacheDir).toContain('.slopsquash');
  });

  it('loads and merges config from file when it exists', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ defaultAction: 'warn', allowlist: ['my-pkg'] }));
    const config = loadConfig();
    expect(config.defaultAction).toBe('warn');
    expect(config.allowlist).toEqual(['my-pkg']);
    // defaults still present
    expect(config.networkEnabled).toBe(true);
  });

  it('overrides take precedence over file config', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ defaultAction: 'warn' }));
    const config = loadConfig({ defaultAction: 'block', networkTimeoutMs: 5000 });
    expect(config.defaultAction).toBe('block');
    expect(config.networkTimeoutMs).toBe(5000);
  });

  it('handles malformed config file gracefully', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('NOT VALID JSON {{{');
    const config = loadConfig();
    // Should fall back to defaults
    expect(config.defaultAction).toBe('block');
    expect(config.allowlist).toEqual([]);
  });
});
