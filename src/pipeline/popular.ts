import { CheckReason } from '../types.js';

/**
 * Stage 4: Check if a package name is in the top-N popular packages list.
 * Returns a CheckReason (severity: 'info') if the name is found, null otherwise.
 */
export function checkPopular(name: string, topPackages: string[]): CheckReason | null {
  const normalized = name.toLowerCase();
  // Also handle scoped packages — compare case-insensitively
  const isPopular = topPackages.some(p => p.toLowerCase() === normalized);
  if (isPopular) {
    return {
      check: 'popular',
      detail: `'${name}' is a known popular package`,
      severity: 'info',
    };
  }
  return null;
}
