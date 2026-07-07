import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { SlopsquashConfig } from './types.js';

const DEFAULT_CACHE_DIR = join(homedir(), '.slopsquash');

const DEFAULTS: SlopsquashConfig = {
  defaultAction: 'block',   // aggressive by default
  allowlist: [],
  blocklist: [],
  networkEnabled: true,
  networkTimeoutMs: 3000,
  cacheDir: DEFAULT_CACHE_DIR,
};

export function loadConfig(overrides?: Partial<SlopsquashConfig>): SlopsquashConfig {
  let fileConfig: Partial<SlopsquashConfig> = {};
  const configPath = join(DEFAULT_CACHE_DIR, 'config.json');
  if (existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      // ignore malformed config
    }
  }
  return { ...DEFAULTS, ...fileConfig, ...overrides };
}
