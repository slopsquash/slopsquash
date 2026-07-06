/**
 * slopsquash — the library entry point.
 *
 * Import this from other code:
 *   import { greet } from "slopsquash";
 */

export function greet(name?: string): string {
  return `Hello, ${name ?? "world"}! 👋  You've been slopsquashed.`;
}
