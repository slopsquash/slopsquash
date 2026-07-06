#!/usr/bin/env node

/**
 * slopsquash CLI — just prints hello world.
 *
 * Usage:
 *   npx slopsquash
 *   npx slopsquash Alice
 */

import { greet } from "./index.js";

const name = process.argv[2];
console.log(greet(name));
