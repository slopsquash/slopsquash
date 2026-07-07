import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { RegistryCacheEntry, SlopsquashConfig } from '../types.js';

interface CacheData {
  [packageName: string]: RegistryCacheEntry;
}

export class CacheStore {
  private data: CacheData = {};
  private filePath: string;
  private dirty = false;

  constructor(cacheDir: string) {
    mkdirSync(cacheDir, { recursive: true });
    this.filePath = join(cacheDir, 'cache.json');
    this.load();
  }

  private load(): void {
    if (existsSync(this.filePath)) {
      try {
        this.data = JSON.parse(readFileSync(this.filePath, 'utf-8'));
      } catch {
        this.data = {};
      }
    }
  }

  get(name: string): RegistryCacheEntry | undefined {
    return this.data[name.toLowerCase()];
  }

  set(name: string, entry: RegistryCacheEntry): void {
    this.data[name.toLowerCase()] = entry;
    this.dirty = true;
  }

  /** Check if a cached entry is still fresh */
  isFresh(name: string, ttlMs: number = 24 * 60 * 60 * 1000): boolean {
    const entry = this.get(name);
    if (!entry) return false;
    const age = Date.now() - new Date(entry.checkedAt).getTime();
    return age < ttlMs;
  }

  /** Write to disk if there are pending changes */
  flush(): void {
    if (this.dirty) {
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
      this.dirty = false;
    }
  }
}
