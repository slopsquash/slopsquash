import { CheckReason } from '../types.js';

/**
 * Stage 3: Check if a package name matches a known AI-hallucinated package name.
 * Returns a CheckReason if the name is found, null otherwise.
 */
export function checkPatterns(name: string, patternList: string[]): CheckReason | null {
  const normalized = name.toLowerCase();
  if (patternList.includes(normalized)) {
    return {
      check: 'pattern',
      detail: `'${name}' matches a known AI-hallucinated package name`,
      severity: 'high',
    };
  }
  return null;
}
