import { describe, expect, it, vi } from 'vitest';
import { DefiLlamaClient } from './defillama.js';

const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const MISSING = '0x000000000000000000000000000000000000dead';

function mockFetchOnce(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe('DefiLlamaClient.getPrices', () => {
  it('keys results by lowercased address (base: prefix stripped) and omits missing tokens', async () => {
    const body = {
      coins: {
        [`base:${WETH}`]: { decimals: 18, symbol: 'WETH', price: 1984.39, timestamp: 1780305325, confidence: 0.99 },
        [`base:${USDC}`]: { decimals: 6, symbol: 'USDC', price: 0.9995, confidence: 0.99 },
      },
    };
    const fetchImpl = mockFetchOnce(body);
    const c = new DefiLlamaClient({ fetchImpl });
    const prices = await c.getPrices([WETH, USDC, MISSING]);

    const url = String(fetchImpl.mock.calls[0]![0]);
    expect(url).toContain(`/prices/current/base:${WETH},base:${USDC},base:${MISSING}`);

    expect(prices[WETH.toLowerCase()]).toEqual({ price: 1984.39, symbol: 'WETH', decimals: 18, confidence: 0.99 });
    expect(prices[USDC.toLowerCase()]!.price).toBe(0.9995);
    // MISSING was not in the response → silently omitted.
    expect(prices[MISSING.toLowerCase()]).toBeUndefined();
  });

  it('returns an empty object for no addresses without calling fetch', async () => {
    const fetchImpl = mockFetchOnce({ coins: {} });
    const c = new DefiLlamaClient({ fetchImpl });
    expect(await c.getPrices([])).toEqual({});
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('throws on a non-ok response', async () => {
    const c = new DefiLlamaClient({ fetchImpl: mockFetchOnce({ error: 'boom' }, false) });
    await expect(c.getPrices([WETH])).rejects.toThrow(/DefiLlama getPrices failed/i);
  });
});
