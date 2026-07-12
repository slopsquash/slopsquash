#!/usr/bin/env node

/**
 * slopsquash CLI
 *
 * Usage:
 *   slopsquash check <package-name> [--ecosystem npm|pypi]
 *   slopsquash check <pkg1> <pkg2> ... [--ecosystem npm|pypi]
 */

import { checkPackage, checkPackages } from './pipeline/runner.js';
import type { Ecosystem } from './types.js';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
slopsquash — AI-native protection against slopsquatted packages.

Usage:
  slopsquash check <package>           Check a single package
  slopsquash check <p1> <p2> ...       Check multiple packages
  slopsquash check <package> --pypi    Check a PyPI package

Options:
  --ecosystem <npm|pypi>    Package ecosystem (default: npm)
  --pypi                    Shorthand for --ecosystem pypi
  --warn-only               Use 'warn' instead of 'block' as default action
  -h, --help                Show this help message

Examples:
  slopsquash check express
  slopsquash check chalks lodash-utils react-form-helpers
  slopsquash check requests --pypi
`);
  process.exit(0);
}

async function main() {
  const command = args[0];
  if (command !== 'check') {
    console.error(`Unknown command: ${command}. Use 'slopsquash check <package>' or 'slopsquash --help'.`);
    process.exit(1);
  }

  // Parse flags
  let ecosystem: Ecosystem = 'npm';
  let warnOnly = false;
  const packageNames: string[] = [];

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--ecosystem' && args[i + 1]) {
      ecosystem = args[++i] as Ecosystem;
    } else if (args[i] === '--pypi') {
      ecosystem = 'pypi';
    } else if (args[i] === '--warn-only') {
      warnOnly = true;
    } else if (!args[i].startsWith('--')) {
      packageNames.push(args[i]);
    }
  }

  if (packageNames.length === 0) {
    console.error('Error: No package names provided. Use: slopsquash check <package>');
    process.exit(1);
  }

  const configOverrides = warnOnly ? { defaultAction: 'warn' as const } : undefined;

  const results = await checkPackages(packageNames, ecosystem, configOverrides);

  let hasBlocked = false;
  for (const result of results) {
    const icon = result.verdict === 'block' ? '[x]' : result.verdict === 'warn' ? '[!]' : '[v]';
    console.log(`\n${icon} ${result.name} — ${result.verdict.toUpperCase()}`);

    if (result.suggestion) {
      console.log(`   > Did you mean: ${result.suggestion}?`);
    }

    for (const r of result.reasons) {
      const sevIcon = r.severity === 'critical' ? '[x]' : r.severity === 'high' ? '[!]' : r.severity === 'medium' ? '[-]' : '[i]';
      console.log(`   ${sevIcon} [${r.check}] ${r.detail}`);
    }

    if (result.verdict === 'block') hasBlocked = true;
  }

  console.log();
  process.exit(hasBlocked ? 1 : 0);
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
