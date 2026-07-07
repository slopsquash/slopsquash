import { CheckReason, Ecosystem, RegistryCacheEntry } from '../types.js';

interface RegistryResult {
  reason: CheckReason | null;
  cacheEntry: RegistryCacheEntry;
}

/**
 * Stage 5: Check a package name against the npm or PyPI registry.
 *
 * Returns a CheckReason if:
 *   - Package doesn't exist on the registry (severity: 'medium')
 *   - Package was published very recently (< 7 days: 'medium', < 30 days: 'low')
 *
 * Always returns a RegistryCacheEntry for caching.
 * On timeout or network error, returns null reason (don't penalize).
 */
export async function checkRegistry(
  name: string,
  ecosystem: Ecosystem,
  timeoutMs: number = 3000
): Promise<RegistryResult> {
  const url = ecosystem === 'npm'
    ? `https://registry.npmjs.org/${encodeURIComponent(name)}`
    : `https://pypi.org/pypi/${encodeURIComponent(name)}/json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timer);

    if (response.status === 404) {
      return {
        reason: {
          check: 'registry',
          detail: `'${name}' was not found on the ${ecosystem} registry`,
          severity: 'medium',
        },
        cacheEntry: {
          exists: false,
          publishedAt: null,
          downloads: null,
          checkedAt: new Date().toISOString(),
        },
      };
    }

    if (!response.ok) {
      // Non-404 error, don't penalize
      return {
        reason: null,
        cacheEntry: {
          exists: false,
          publishedAt: null,
          downloads: null,
          checkedAt: new Date().toISOString(),
        },
      };
    }

    const data = await response.json() as Record<string, unknown>;
    let publishedAt: string | null = null;

    if (ecosystem === 'npm') {
      const time = data.time as Record<string, string> | undefined;
      publishedAt = time?.created ?? null;
    } else {
      // PyPI: get the earliest release upload time
      const releases = data.releases as Record<string, Array<{ upload_time: string }>> | undefined;
      if (releases) {
        let earliest: string | null = null;
        for (const files of Object.values(releases)) {
          for (const f of files) {
            if (!earliest || f.upload_time < earliest) {
              earliest = f.upload_time;
            }
          }
        }
        publishedAt = earliest;
      }
    }

    const cacheEntry: RegistryCacheEntry = {
      exists: true,
      publishedAt,
      downloads: null,
      checkedAt: new Date().toISOString(),
    };

    // Check age
    let reason: CheckReason | null = null;
    if (publishedAt) {
      const ageMs = Date.now() - new Date(publishedAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < 7) {
        reason = {
          check: 'registry',
          detail: `'${name}' was published only ${Math.floor(ageDays)} day(s) ago on ${ecosystem}`,
          severity: 'medium',
        };
      } else if (ageDays < 30) {
        reason = {
          check: 'registry',
          detail: `'${name}' was published ${Math.floor(ageDays)} days ago on ${ecosystem}`,
          severity: 'low',
        };
      }
    }

    return { reason, cacheEntry };
  } catch (_err) {
    clearTimeout(timer);
    // Network error or timeout — don't penalize
    return {
      reason: null,
      cacheEntry: {
        exists: false,
        publishedAt: null,
        downloads: null,
        checkedAt: new Date().toISOString(),
      },
    };
  }
}
