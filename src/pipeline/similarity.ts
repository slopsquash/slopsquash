import { CheckReason } from '../types.js';

/**
 * Compute the Levenshtein distance between two strings using standard DP.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Optimize: use single-row DP (O(min(m,n)) space)
  if (m === 0) return n;
  if (n === 0) return m;

  // Ensure we iterate over the shorter string in the inner loop
  const [shorter, longer] = m <= n ? [a, b] : [b, a];
  const sLen = shorter.length;
  const lLen = longer.length;

  let prev = new Array<number>(sLen + 1);
  let curr = new Array<number>(sLen + 1);

  for (let j = 0; j <= sLen; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= lLen; i++) {
    curr[0] = i;
    for (let j = 1; j <= sLen; j++) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[sLen];
}

/**
 * Compute the Jaro similarity between two strings.
 * Returns a value between 0.0 and 1.0.
 */
function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);

  const aMatched = new Array<boolean>(a.length).fill(false);
  const bMatched = new Array<boolean>(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(b.length - 1, i + matchWindow);

    for (let j = start; j <= end; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue;
      aMatched[i] = true;
      bMatched[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  return (
    (matches / a.length +
      matches / b.length +
      (matches - transpositions / 2) / matches) /
    3
  );
}

/**
 * Compute the Jaro-Winkler similarity between two strings.
 * Applies a prefix bonus on top of Jaro similarity.
 * Returns a value between 0.0 and 1.0.
 */
export function jaroWinklerSimilarity(a: string, b: string): number {
  const jaro = jaroSimilarity(a, b);

  // Find common prefix length (up to 4 characters)
  let prefixLen = 0;
  const maxPrefix = Math.min(4, a.length, b.length);
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) {
      prefixLen++;
    } else {
      break;
    }
  }

  // Winkler scaling factor (standard p = 0.1)
  const p = 0.1;
  return jaro + prefixLen * p * (1 - jaro);
}

/**
 * Parse a scoped package name like "@scope/name" into its parts.
 * Returns null for unscoped packages.
 */
function parseScopedName(name: string): { scope: string; localName: string } | null {
  if (!name.startsWith('@')) return null;
  const slashIdx = name.indexOf('/');
  if (slashIdx === -1) return null;
  return {
    scope: name.slice(0, slashIdx),     // e.g. "@types"
    localName: name.slice(slashIdx + 1), // e.g. "react"
  };
}

interface SimilarityMatch {
  package: string;
  levenshtein: number;
  jaroWinkler: number;
  compositeScore: number;
}

/**
 * Compute a composite similarity score between two package names.
 * Higher score = more similar (range roughly 0.0 to 1.0).
 */
function computeCompositeScore(levDist: number, jwSim: number, maxLen: number): number {
  // Normalize Levenshtein to a 0-1 similarity (1 = identical)
  const levSim = maxLen > 0 ? 1 - levDist / maxLen : 1;
  // Weight Jaro-Winkler more heavily as it handles transpositions better
  return levSim * 0.4 + jwSim * 0.6;
}

/**
 * Compare two package names, handling scoped packages by comparing
 * scope and name parts separately.
 */
function compareNames(
  a: string,
  b: string
): { levenshtein: number; jaroWinkler: number; maxLen: number } {
  const aParsed = parseScopedName(a);
  const bParsed = parseScopedName(b);

  // Both scoped: compare scope and local name separately
  if (aParsed && bParsed) {
    const scopeLev = levenshteinDistance(aParsed.scope, bParsed.scope);
    const nameLev = levenshteinDistance(aParsed.localName, bParsed.localName);
    const scopeJw = jaroWinklerSimilarity(aParsed.scope, bParsed.scope);
    const nameJw = jaroWinklerSimilarity(aParsed.localName, bParsed.localName);

    // Combined distance: sum of scope + name distances
    // Combined JW: weighted average (name matters more)
    return {
      levenshtein: scopeLev + nameLev,
      jaroWinkler: scopeJw * 0.3 + nameJw * 0.7,
      maxLen: Math.max(a.length, b.length),
    };
  }

  // One scoped, one not, or both unscoped: compare full strings
  return {
    levenshtein: levenshteinDistance(a, b),
    jaroWinkler: jaroWinklerSimilarity(a, b),
    maxLen: Math.max(a.length, b.length),
  };
}

export interface SimilarityResult {
  reason: CheckReason | null;
  suggestion: string | null;
  confidence: number;
}

/**
 * Stage 2: Composite similarity scoring against the top-N package list.
 *
 * Checks if a package name is suspiciously similar to a known popular package.
 * Uses Levenshtein distance and Jaro-Winkler similarity with adaptive thresholds
 * based on name length.
 *
 * @param name - The package name to check
 * @param topPackages - List of known popular package names
 * @param threshold - Minimum Jaro-Winkler similarity for a match (default 0.85)
 * @returns Similarity result with reason, suggestion, and confidence
 */
export function checkSimilarity(
  name: string,
  topPackages: string[],
  threshold: number = 0.85
): SimilarityResult {
  const normalized = name.toLowerCase();

  // Pre-process into a Set for O(1) exact-match check
  const topSet = new Set(topPackages.map(p => p.toLowerCase()));

  // If the name is already a known popular package, it's legit
  if (topSet.has(normalized)) {
    return { reason: null, suggestion: null, confidence: 0 };
  }

  // Adaptive max Levenshtein distance based on name length
  // Short names (<=4 chars) need a closer match to avoid false positives
  const nameLen = normalized.replace(/^@[^/]+\//, '').length; // use local name length for scoped pkgs
  const maxLevenshtein = nameLen <= 4 ? 1 : 2;

  let bestMatch: SimilarityMatch | null = null;

  for (const pkg of topPackages) {
    const pkgNormalized = pkg.toLowerCase();
    const { levenshtein, jaroWinkler, maxLen } = compareNames(normalized, pkgNormalized);

    // Quick rejection: skip if Levenshtein is way too high
    if (levenshtein > maxLevenshtein) continue;

    // Check Jaro-Winkler threshold
    if (jaroWinkler < threshold) continue;

    const compositeScore = computeCompositeScore(levenshtein, jaroWinkler, maxLen);

    if (!bestMatch || compositeScore > bestMatch.compositeScore) {
      bestMatch = {
        package: pkg, // preserve original casing
        levenshtein,
        jaroWinkler,
        compositeScore,
      };
    }
  }

  if (!bestMatch) {
    return { reason: null, suggestion: null, confidence: 0 };
  }

  // Confidence scales with how close the match is
  // Perfect composite score (1.0) → confidence 1.0
  // At threshold boundary → lower confidence
  const confidence = Math.min(1, bestMatch.compositeScore);

  const severity = bestMatch.levenshtein <= 1 ? 'high' : 'medium';

  return {
    reason: {
      check: 'similarity',
      detail: `'${name}' is suspiciously similar to popular package '${bestMatch.package}' (edit distance: ${bestMatch.levenshtein}, similarity: ${bestMatch.jaroWinkler.toFixed(2)})`,
      severity,
    },
    suggestion: bestMatch.package,
    confidence,
  };
}
