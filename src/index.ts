/**
 * slopsquash — AI-native slopsquatting protection.
 *
 * Usage:
 *   import { checkPackage, checkPackages } from 'slopsquash';
 */

export { checkPackage, checkPackages } from './pipeline/runner.js';
export { loadConfig } from './config.js';
export type {
  CheckResult,
  CheckReason,
  Verdict,
  Severity,
  Ecosystem,
  SlopsquashConfig,
  DefaultAction,
} from './types.js';

// Keep the greet function for backwards compatibility with 0.1.0
export function greet(name?: string): string {
  return `Hello, ${name ?? 'world'}! 👋  You've been slopsquashed.`;
}
