import { describe, expect, it, vi } from 'vitest';
import { GeckoTerminalClient } from './geckoterminal.js';

const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const POOL = '0x6c561b446416e1a00e8e93e221854d6ea4171372';

function mockFetchOnce(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe('GeckoTerminalClient.resolvePool', () => {
  it('picks the first pool whose other side matches tokenB (case-insensitive)', async () => {
    const body = {
      data: [
        {
          // A WETH/USDT pool (no match) appears first to prove we skip it.
          attributes: { address: '0xWETHUSDT' },
          relationships: {
            base_token: { data: { id: `base_${WETH.toLowerCase()}` } },
            quote_token: { data: { id: 'base_0xfde4c96c8593536e31f229ea8f37b2ada2699bb2' } },
          },
        },
        {
          attributes: { address: POOL },
          relationships: {
            base_token: { data: { id: `base_${WETH.toUpperCase()}` } },
            quote_token: { data: { id: `base_${USDC.toUpperCase()}` } },
          },
        },
      ],
    };
    const fetchImpl = mockFetchOnce(body);
    const c = new GeckoTerminalClient({ fetchImpl });
    const pool = await c.resolvePool(WETH, USDC);
    expect(pool).toBe(POOL);
    expect(String(fetchImpl.mock.calls[0]![0])).toContain(`/networks/base/tokens/${WETH}/pools`);
  });

  it('returns null when no pool pairs the two tokens', async () => {
    const body = {
      data: [
        {
          attributes: { address: '0xother' },
          relationships: {
            base_token: { data: { id: `base_${WETH.toLowerCase()}` } },
            quote_token: { data: { id: 'base_0xdeadbeef00000000000000000000000000000000' } },
          },
        },
      ],
    };
    const c = new GeckoTerminalClient({ fetchImpl: mockFetchOnce(body) });
    expect(await c.resolvePool(WETH, USDC)).toBeNull();
  });

  it('throws a clear error on a non-ok response', async () => {
    const c = new GeckoTerminalClient({ fetchImpl: mockFetchOnce({ error: 'nope' }, false) });
    await expect(c.resolvePool(WETH, USDC)).rejects.toThrow(/GeckoTerminal resolvePool failed/i);
  });
});

describe('GeckoTerminalClient.getOhlcv', () => {
  it('maps rows and reverses newest-first input to oldest-first', async () => {
    const body = {
      data: {
        attributes: {
          ohlcv_list: [
            [1780304400, 1981.52, 1984.09, 1980.96, 1983.51, 682362.44],
            [1780300800, 1975.64, 1981.52, 1970.26, 1981.52, 1118122.78],
          ],
        },
      },
    };
    const fetchImpl = mockFetchOnce(body);
    const c = new GeckoTerminalClient({ fetchImpl });
    const bars = await c.getOhlcv(POOL, 'hour', { aggregate: 1, limit: 2 });

    const url = String(fetchImpl.mock.calls[0]![0]);
    expect(url).toContain(`/pools/${POOL}/ohlcv/hour`);
    expect(url).toContain('aggregate=1');
    expect(url).toContain('limit=2');
    expect(url).toContain('currency=usd');

    // Oldest bar first after the reverse.
    expect(bars[0]).toEqual({ t: 1780300800, o: 1975.64, h: 1981.52, l: 1970.26, c: 1981.52, v: 1118122.78 });
    expect(bars[1]!.t).toBe(1780304400);
  });
});

describe('GeckoTerminalClient.getTrades', () => {
  it('maps trade attributes and applies the minUsd filter param', async () => {
    const body = {
      data: [
        {
          id: 'base_46757873_0xabc_424_1780305096',
          attributes: {
            block_number: 46757873,
            tx_hash: '0xa7820dbc',
            tx_from_address: '0x3ff44cb290f72440e44b345a0d2dc89cdbc9c38f',
            from_token_address: USDC,
            to_token_address: WETH,
            from_token_amount: '24424.122397',
            to_token_amount: '12.302327068402',
            block_timestamp: '2026-06-01T09:11:33Z',
            kind: 'buy',
            volume_in_usd: '24405.3564382959',
          },
        },
      ],
    };
    const fetchImpl = mockFetchOnce(body);
    const c = new GeckoTerminalClient({ fetchImpl });
    const trades = await c.getTrades(POOL, { minUsd: 100 });

    expect(String(fetchImpl.mock.calls[0]![0])).toContain('trade_volume_in_usd_greater_than=100');
    expect(trades).toHaveLength(1);
    expect(trades[0]).toEqual({
      id: 'base_46757873_0xabc_424_1780305096',
      block: 46757873,
      ts: '2026-06-01T09:11:33Z',
      txHash: '0xa7820dbc',
      maker: '0x3ff44cb290f72440e44b345a0d2dc89cdbc9c38f',
      fromToken: USDC,
      toToken: WETH,
      fromAmount: '24424.122397',
      toAmount: '12.302327068402',
      usd: 24405.3564382959,
      kind: 'buy',
    });
  });
});
