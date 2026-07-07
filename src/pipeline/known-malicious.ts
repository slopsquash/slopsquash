import { CheckReason } from '../types.js';

/**
 * Stage 1: Check if a package name is on the known-malicious list.
 * Returns a CheckReason if the name is found, null otherwise.
 */
export function checkKnownMalicious(name: string, maliciousList: string[]): CheckReason | null {
  const normalized = name.toLowerCase();
  if (maliciousList.includes(normalized)) {
    return {
      check: 'known-malicious',
      detail: `'${name}' is on the known-malicious package list`,
      severity: 'critical',
    };
  }
  return null;
}
