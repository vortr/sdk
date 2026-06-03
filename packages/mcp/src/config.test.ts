import { afterEach, describe, expect, it, vi } from 'vitest';
import { readConfig } from './config.js';

describe('readConfig', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns config when env is present', () => {
    const c = readConfig({ VORTR_API_BASE: 'https://vortr.app', VORTR_API_SECRET: 's' });
    expect(c.apiBase).toBe('https://vortr.app');
    expect(c.apiSecret).toBe('s');
  });
  it('throws loudly when VORTR_API_BASE is missing', () => {
    expect(() => readConfig({ VORTR_API_SECRET: 's' })).toThrow(/VORTR_API_BASE/);
  });
  it('throws when VORTR_API_SECRET is missing', () => {
    expect(() => readConfig({ VORTR_API_BASE: 'https://vortr.app' })).toThrow(/VORTR_API_SECRET/);
  });
  it('allows a localhost api base for local dev and warns on stderr', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    const c = readConfig({ VORTR_API_BASE: 'http://localhost:3000', VORTR_API_SECRET: 's' });
    expect(c.apiBase).toBe('http://localhost:3000');
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/localhost/i));
  });
  it('allows 0.0.0.0 / uppercase LOCALHOST (also warns)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(readConfig({ VORTR_API_BASE: 'http://0.0.0.0:3000', VORTR_API_SECRET: 's' }).apiBase)
      .toBe('http://0.0.0.0:3000');
    expect(readConfig({ VORTR_API_BASE: 'https://LOCALHOST:3000', VORTR_API_SECRET: 's' }).apiBase)
      .toBe('https://LOCALHOST:3000');
  });
});
