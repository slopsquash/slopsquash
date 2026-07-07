/**
 * Data loader for slopsquash JSON data files.
 *
 * Lazily loads and caches the JSON data files from the repo-root data/ directory.
 * All functions are synchronous (readFileSync) since this data is loaded once at startup.
 *
 * Path resolution: in the compiled output this file lives at build/data/loader.js,
 * so the repo-root data/ directory is at ../../data/ relative to __dirname.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, "..", "..", "data");

// ── Cached data ────────────────────────────────────────────────────────

let cachedTopNpm: string[] | null = null;
let cachedTopPypi: string[] | null = null;
let cachedSlopsquatPatterns: string[] | null = null;
let cachedMaliciousNpm: string[] | null = null;
let cachedMaliciousPypi: string[] | null = null;

// ── Helpers ────────────────────────────────────────────────────────────

function loadJsonFile<T>(filename: string): T {
  const filepath = join(DATA_DIR, filename);
  const raw = readFileSync(filepath, "utf-8");
  return JSON.parse(raw) as T;
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Returns the list of high-impact / top package names for the given ecosystem.
 * Data is loaded once and cached for subsequent calls.
 */
export function loadTopPackages(ecosystem: "npm" | "pypi"): string[] {
  if (ecosystem === "npm") {
    if (!cachedTopNpm) {
      const data = loadJsonFile<{ packages: string[] }>(
        "top-packages-npm.json",
      );
      cachedTopNpm = data.packages;
    }
    return cachedTopNpm;
  }

  // pypi
  if (!cachedTopPypi) {
    const data = loadJsonFile<{ packages: string[] }>(
      "top-packages-pypi.json",
    );
    cachedTopPypi = data.packages;
  }
  return cachedTopPypi;
}

/**
 * Returns the list of known AI-hallucinated package names
 * from the TrendMicro slopsquatting research.
 */
export function loadSlopsquatPatterns(): string[] {
  if (!cachedSlopsquatPatterns) {
    const data = loadJsonFile<{ names: string[] }>("slopsquat-patterns.json");
    cachedSlopsquatPatterns = data.names;
  }
  return cachedSlopsquatPatterns;
}

/**
 * Returns the list of known malicious package names for the given ecosystem.
 */
export function loadKnownMalicious(ecosystem: "npm" | "pypi"): string[] {
  if (ecosystem === "npm") {
    if (!cachedMaliciousNpm) {
      const data = loadJsonFile<{ npm: string[]; pypi: string[] }>(
        "known-malicious.json",
      );
      cachedMaliciousNpm = data.npm;
    }
    return cachedMaliciousNpm;
  }

  // pypi
  if (!cachedMaliciousPypi) {
    const data = loadJsonFile<{ npm: string[]; pypi: string[] }>(
      "known-malicious.json",
    );
    cachedMaliciousPypi = data.pypi;
  }
  return cachedMaliciousPypi;
}
