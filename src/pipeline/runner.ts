import { CheckResult, CheckReason, Verdict, Ecosystem, SlopsquashConfig } from '../types.js';
import { loadTopPackages, loadSlopsquatPatterns, loadKnownMalicious } from '../data/loader.js';
import { checkKnownMalicious } from './known-malicious.js';
import { checkSimilarity } from './similarity.js';
import { checkPatterns } from './patterns.js';
import { checkPopular } from './popular.js';
import { checkRegistry } from './registry.js';
import { CacheStore } from '../cache/store.js';
import { loadConfig } from '../config.js';

export async function checkPackage(
  name: string,
  ecosystem: Ecosystem = 'npm',
  configOverrides?: Partial<SlopsquashConfig>
): Promise<CheckResult> {
  const config = loadConfig(configOverrides);
  const reasons: CheckReason[] = [];
  let suggestion: string | null = null;
  let confidence = 0;
  let cached = true;

  // Check user allowlist first
  if (config.allowlist.some(a => a.toLowerCase() === name.toLowerCase())) {
    return {
      name, ecosystem,
      verdict: 'allow',
      confidence: 1.0,
      reasons: [{ check: 'allowlist', detail: `'${name}' is on the user allowlist`, severity: 'info' }],
      suggestion: null,
      cached: true,
    };
  }

  // Check user blocklist
  if (config.blocklist.some(b => b.toLowerCase() === name.toLowerCase())) {
    return {
      name, ecosystem,
      verdict: 'block',
      confidence: 1.0,
      reasons: [{ check: 'blocklist', detail: `'${name}' is on the user blocklist`, severity: 'critical' }],
      suggestion: null,
      cached: true,
    };
  }

  // Load reference data
  const topPackages = loadTopPackages(ecosystem);
  const maliciousList = loadKnownMalicious(ecosystem);
  const patternList = loadSlopsquatPatterns();

  // Stage 1: Known malicious
  const maliciousResult = checkKnownMalicious(name, maliciousList);
  if (maliciousResult) {
    return {
      name, ecosystem,
      verdict: 'block',
      confidence: 1.0,
      reasons: [maliciousResult],
      suggestion: null,
      cached: true,
    };
  }

  // Stage 4 (check early): Is it a known popular package?
  const popularResult = checkPopular(name, topPackages);
  if (popularResult) {
    return {
      name, ecosystem,
      verdict: 'allow',
      confidence: 1.0,
      reasons: [popularResult],
      suggestion: null,
      cached: true,
    };
  }

  // Stage 2: Similarity check
  const simResult = checkSimilarity(name, topPackages);
  if (simResult.reason) {
    reasons.push(simResult.reason);
    suggestion = simResult.suggestion;
    confidence = Math.max(confidence, simResult.confidence);
  }

  // Stage 3: Pattern check
  const patternResult = checkPatterns(name, patternList);
  if (patternResult) {
    reasons.push(patternResult);
    confidence = Math.max(confidence, 0.8);
  }

  // Stage 5: Registry check (network, optional)
  if (config.networkEnabled) {
    const cache = new CacheStore(config.cacheDir);
    if (!cache.isFresh(name)) {
      cached = false;
      const registryResult = await checkRegistry(name, ecosystem, config.networkTimeoutMs);
      cache.set(name, registryResult.cacheEntry);
      cache.flush();
      if (registryResult.reason) {
        reasons.push(registryResult.reason);
        confidence = Math.max(confidence, 0.6);
      }
    } else {
      const entry = cache.get(name)!;
      if (!entry.exists) {
        // If it's a confirmed missing package (note: network errors also cache as exists=false currently, 
        // but we'll treat them as missing for safety since we couldn't verify it).
        reasons.push({
          check: 'registry',
          detail: `'${name}' was not found on the ${ecosystem} registry (cached)`,
          severity: 'medium',
        });
        confidence = Math.max(confidence, 0.6);
      } else if (entry.publishedAt) {
        const ageMs = Date.now() - new Date(entry.publishedAt).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays < 7) {
          reasons.push({
            check: 'registry',
            detail: `'${name}' was published only ${Math.floor(ageDays)} day(s) ago on ${ecosystem} (cached)`,
            severity: 'medium',
          });
        } else if (ageDays < 30) {
          reasons.push({
            check: 'registry',
            detail: `'${name}' was published ${Math.floor(ageDays)} days ago on ${ecosystem} (cached)`,
            severity: 'low',
          });
        }
      }
    }
  }

  // Determine verdict
  let verdict: Verdict = 'allow';
  if (reasons.length > 0) {
    const maxSeverity = reasons.reduce((max, r) => {
      const order: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
      return (order[r.severity] || 0) > (order[max] || 0) ? r.severity : max;
    }, 'info' as string);

    if (maxSeverity === 'critical' || maxSeverity === 'high') {
      verdict = config.defaultAction;  // 'block' by default
    } else if (maxSeverity === 'medium') {
      verdict = config.defaultAction === 'block' ? 'warn' : 'warn';
    }
    // low/info: keep 'allow'
  }

  return {
    name,
    ecosystem,
    verdict,
    confidence,
    reasons,
    suggestion,
    cached,
  };
}

/** Batch check multiple packages */
export async function checkPackages(
  names: string[],
  ecosystem: Ecosystem = 'npm',
  configOverrides?: Partial<SlopsquashConfig>
): Promise<CheckResult[]> {
  return Promise.all(names.map(name => checkPackage(name, ecosystem, configOverrides)));
}
