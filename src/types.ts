export type Ecosystem = 'npm' | 'pypi';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Verdict = 'block' | 'warn' | 'allow';

export type DefaultAction = 'block' | 'warn';

export interface CheckReason {
  check: string;       // e.g. 'known-malicious', 'similarity', 'pattern', 'popular', 'registry'
  detail: string;      // human-readable explanation
  severity: Severity;
}

export interface CheckResult {
  name: string;
  ecosystem: Ecosystem;
  verdict: Verdict;
  confidence: number;  // 0.0 to 1.0
  reasons: CheckReason[];
  suggestion: string | null;  // e.g. 'Did you mean chalk?'
  cached: boolean;     // whether answered from local data only
}

export interface RegistryCacheEntry {
  exists: boolean;
  publishedAt: string | null;  // ISO date
  downloads: number | null;    // weekly downloads
  checkedAt: string;           // ISO date of when we checked
}

export interface SlopsquashConfig {
  defaultAction: DefaultAction;  // 'block' (default) or 'warn'
  allowlist: string[];           // user-configured allowed package names
  blocklist: string[];           // user-configured blocked package names
  networkEnabled: boolean;       // whether to do registry lookups (default true)
  networkTimeoutMs: number;      // default 3000
  cacheDir: string;              // default ~/.slopsquash
}
