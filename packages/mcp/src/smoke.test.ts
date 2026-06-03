import { afterEach, beforeEach, expect, it } from 'vitest';
import { createServer } from './server.js';

const saved = { ...process.env };
beforeEach(() => { process.env.VORTR_API_BASE = 'https://vortr.app'; process.env.VORTR_API_SECRET = 's'; });
afterEach(() => { process.env = { ...saved }; });

it('constructs the server when env is set', () => {
  expect(createServer().constructor.name).toBe('McpServer');
});

it('throws without required env', () => {
  delete process.env.VORTR_API_BASE;
  expect(() => createServer()).toThrow(/VORTR_API_BASE/);
});
