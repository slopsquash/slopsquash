import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { main } from '../src/cli.js';
import * as runner from '../src/pipeline/runner.js';

let mockExit: any;
let mockLog: any;
let mockError: any;

beforeEach(() => {
  mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  mockError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CLI', () => {
  it('--help prints usage and exits 0', async () => {
    await main(['--help']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('slopsquash'));
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('no args prints usage and exits 0', async () => {
    await main([]);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('slopsquash'));
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('-h prints usage and exits 0', async () => {
    await main(['-h']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('slopsquash'));
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('unknown command prints error and exits 1', async () => {
    await main(['foo']);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('check with no packages prints error and exits 1', async () => {
    await main(['check']);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('No package names'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('check express shows ALLOW and exits 0', async () => {
    await main(['check', 'express']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('[v] express — ALLOW'));
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('check chalks shows BLOCK and exits 1', async () => {
    await main(['check', 'chalks']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('[x] chalks — BLOCK'));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Did you mean: chalk?'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('check express chalks exits 1 (one blocked)', async () => {
    await main(['check', 'express', 'chalks']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('express'));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('chalks'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('check requests --pypi shows ALLOW', async () => {
    await main(['check', 'requests', '--pypi']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('[v] requests — ALLOW'));
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('check requests --ecosystem pypi shows ALLOW', async () => {
    await main(['check', 'requests', '--ecosystem', 'pypi']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('ALLOW'));
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('--warn-only downgrades block to warn', async () => {
    await main(['check', 'chalks', '--warn-only']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('WARN'));
  });

  it('catches main errors', async () => {
    const spy = vi.spyOn(runner, 'checkPackages').mockRejectedValue(new Error('Test error'));
    
    // We can't easily trigger the top-level .catch() because it's guarded by NODE_ENV.
    // Instead we just verify that calling main with the mocked rejection rejects.
    // Wait, main itself throws if checkPackages throws, because it awaits it.
    await expect(main(['check', 'express'])).rejects.toThrow('Test error');
    
    spy.mockRestore();
  });
});
