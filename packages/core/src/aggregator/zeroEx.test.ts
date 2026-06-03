import { describe, expect, it, vi } from 'vitest';
import { ZeroExAggregator } from './zeroEx.js';

const TAKER = '0x1111111111111111111111111111111111111111';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH = '0x4200000000000000000000000000000000000006';

function mockFetchOnce(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

const QUOTE_BODY = {
  liquidityAvailable: true,
  buyAmount: '500000000000000',
  sellAmount: '1000000',
  minBuyAmount: '497500000000000',
  allowanceTarget: '0x0000000000001fF3684f28c67538d4D072C22734',
  totalNetworkFee: '1234',
  transaction: {
    to: '0x0000000000001fF3684f28c67538d4D072C22734',
    data: '0xdeadbeef',
    value: '0',
    gas: '210000',
  },
  issues: { allowance: { actual: '0', spender: '0x0000000000001fF3684f28c67538d4D072C22734' }, balance: null },
  route: {
    fills: [
      { source: 'Uniswap_V3', from: USDC, to: WETH, proportionBps: '6000' },
      { source: 'Aerodrome', from: USDC, to: WETH, proportionBps: '4000' },
    ],
    tokens: [
      { address: USDC, symbol: 'USDC' },
      { address: WETH, symbol: 'WETH' },
    ],
  },
};

describe('ZeroExAggregator.quote', () => {
  it('calls the allowance-holder/quote endpoint with v2 headers and maps the response', async () => {
    const fetchImpl = mockFetchOnce(QUOTE_BODY);
    const agg = new ZeroExAggregator({ apiKey: 'k', fetchImpl });

    const q = await agg.quote({
      chainId: 8453, sellToken: USDC, buyToken: WETH, sellAmount: '1000000', taker: TAKER, slippageBps: 50,
    });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toContain('/swap/allowance-holder/quote');
    expect(String(url)).toContain('chainId=8453');
    expect(String(url)).toContain('sellAmount=1000000');
    expect(init.headers['0x-api-key']).toBe('k');
    expect(init.headers['0x-version']).toBe('v2');

    expect(q.minBuyAmount).toBe('497500000000000');
    expect(q.allowanceTarget).toBe('0x0000000000001fF3684f28c67538d4D072C22734');
    expect(q.allowanceActual).toBe('0');
    expect(q.taker).toBe(TAKER);
    expect(q.transaction.to).toBe('0x0000000000001fF3684f28c67538d4D072C22734');
    expect(q.liquidityAvailable).toBe(true);
  });

  it('maps the 0x route (fills + tokens) when present', async () => {
    const agg = new ZeroExAggregator({ apiKey: 'k', fetchImpl: mockFetchOnce(QUOTE_BODY) });
    const q = await agg.quote({ chainId: 8453, sellToken: USDC, buyToken: WETH, sellAmount: '1000000', taker: TAKER });

    expect(q.route).toBeDefined();
    expect(q.route!.fills).toHaveLength(2);
    expect(q.route!.fills[0]).toEqual({ source: 'Uniswap_V3', from: USDC, to: WETH, proportionBps: '6000' });
    // proportionBps stays a string; consumers do Number(bps)/100 = percent per-hop.
    expect(Number(q.route!.fills[0]!.proportionBps) / 100).toBe(60);
    expect(q.route!.tokens).toEqual([
      { address: USDC, symbol: 'USDC' },
      { address: WETH, symbol: 'WETH' },
    ]);
  });

  it('omits route when the 0x response has none', async () => {
    const { route, ...noRoute } = QUOTE_BODY;
    const agg = new ZeroExAggregator({ apiKey: 'k', fetchImpl: mockFetchOnce(noRoute) });
    const q = await agg.quote({ chainId: 8453, sellToken: USDC, buyToken: WETH, sellAmount: '1000000', taker: TAKER });
    expect(q.route).toBeUndefined();
  });

  it('falls back to issues.allowance.spender when allowanceTarget is absent', async () => {
    const body = { ...QUOTE_BODY, allowanceTarget: undefined };
    const agg = new ZeroExAggregator({ apiKey: 'k', fetchImpl: mockFetchOnce(body) });
    const q = await agg.quote({ chainId: 8453, sellToken: USDC, buyToken: WETH, sellAmount: '1000000', taker: TAKER });
    expect(q.allowanceTarget).toBe('0x0000000000001fF3684f28c67538d4D072C22734');
  });

  it('throws on a non-ok response', async () => {
    const agg = new ZeroExAggregator({ apiKey: 'k', fetchImpl: mockFetchOnce({ reason: 'bad' }, false) });
    await expect(
      agg.quote({ chainId: 8453, sellToken: USDC, buyToken: WETH, sellAmount: '1000000', taker: TAKER }),
    ).rejects.toThrow(/0x quote failed/i);
  });

  it('returns a non-executable quote when liquidity is unavailable', async () => {
    const agg = new ZeroExAggregator({ apiKey: 'k', fetchImpl: mockFetchOnce({ liquidityAvailable: false }) });
    const q = await agg.quote({ chainId: 8453, sellToken: USDC, buyToken: WETH, sellAmount: '1000000', taker: TAKER });
    expect(q.liquidityAvailable).toBe(false);
    expect(q.buyAmount).toBe('0');
  });

  it('throws when a liquidity-available response is missing the transaction', async () => {
    const body = {
      liquidityAvailable: true,
      buyAmount: '1',
      minBuyAmount: '1',
      allowanceTarget: '0x0000000000001fF3684f28c67538d4D072C22734',
    };
    const agg = new ZeroExAggregator({ apiKey: 'k', fetchImpl: mockFetchOnce(body) });
    await expect(
      agg.quote({ chainId: 8453, sellToken: USDC, buyToken: WETH, sellAmount: '1000000', taker: TAKER }),
    ).rejects.toThrow(/missing required fields/i);
  });
});
