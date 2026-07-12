import { describe, it, expect } from 'vitest';
import { greet, checkPackage, checkPackages } from '../src/index.js';

describe('greet', () => {
  it('returns default message with "world" when no argument given', () => {
    const result = greet();
    expect(result).toBe("Hello, world! 👋  You've been slopsquashed.");
  });

  it('returns personalized message when name is provided', () => {
    const result = greet('foo');
    expect(result).toBe("Hello, foo! 👋  You've been slopsquashed.");
  });
});

describe('re-exports', () => {
  it('checkPackage is re-exported and callable', () => {
    expect(typeof checkPackage).toBe('function');
  });

  it('checkPackages is re-exported and callable', () => {
    expect(typeof checkPackages).toBe('function');
  });
});
