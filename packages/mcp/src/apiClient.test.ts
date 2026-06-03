import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient.js';

function mockFetch(body: unknown, { ok = true, status = 200, version = '1' } = {}) {
  return vi.fn().mockResolvedValue({
    ok, status,
    headers: { get: (h: string) => (h.toLowerCase() === 'x-vortr-api-version' ? version : null) },
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

const cfg = { apiBase: 'https://vortr.app', apiSecret: 's' };

describe('ApiClient.postQuote', () => {
  it('sends the secret header and returns the body', async () => {
    const fetchImpl = mockFetch({ minBuyAmount: '4' });
    const client = new ApiClient(cfg, fetchImpl);
    const out = await client.postQuote({ chainId: 8453 } as any);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe('https://vortr.app/api/quote');
    expect(init.headers['x-vortr-secret']).toBe('s');
    expect(out.minBuyAmount).toBe('4');
  });

  it('throws a clear error on a non-ok response', async () => {
    const client = new ApiClient(cfg, mockFetch({ error: 'no liquidity' }, { ok: false, status: 422 }));
    await expect(client.postQuote({} as any)).rejects.toThrow(/422.*no liquidity/);
  });

  it('throws on an API version mismatch', async () => {
    const client = new ApiClient(cfg, mockFetch({ ok: true }, { version: '2' }));
    await expect(client.postQuote({} as any)).rejects.toThrow(/version/i);
  });
});
