/**
 * GeckoTerminal market-data client (Base network). Free, no API key required.
 *
 * Attribution: data powered by GeckoTerminal (https://www.geckoterminal.com).
 *
 * `fetchImpl` is injectable so the client is unit-testable without network.
 */

const BASE_URL = 'https://api.geckoterminal.com/api/v2';
const NETWORK = 'base';

type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<any>;
  text(): Promise<string>;
}>;

export type Timeframe = 'day' | 'hour' | 'minute';

export interface OhlcvBar {
  /** Bar open time, unix seconds. */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface GeckoTrade {
  id: string;
  block: number;
  /** ISO-8601 timestamp string. */
  ts: string;
  txHash: string;
  /** Maker / tx sender EOA. */
  maker: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  usd: number;
  kind: 'buy' | 'sell';
}

export interface GeckoTerminalOptions {
  fetchImpl?: FetchLike;
  baseUrl?: string;
}

export interface GetOhlcvOptions {
  aggregate?: number;
  limit?: number;
}

export interface GetTradesOptions {
  /** Only return trades with USD volume strictly greater than this. */
  minUsd?: number;
}

function lowerAddr(id: string | undefined): string {
  // GeckoTerminal token ids look like `base_0xABC…`; strip the network prefix.
  if (!id) return '';
  const idx = id.indexOf('_');
  const addr = idx >= 0 ? id.slice(idx + 1) : id;
  return addr.toLowerCase();
}

export class GeckoTerminalClient {
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;

  constructor(opts: GeckoTerminalOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    this.baseUrl = opts.baseUrl ?? BASE_URL;
  }

  private async getJson(url: string, label: string): Promise<any> {
    let res;
    try {
      res = await this.fetchImpl(url);
    } catch {
      // Transient network/abort reject (common in dev when a client request is
      // cancelled mid-flight) — retry once before giving up. HTTP errors below
      // are NOT retried (they're deterministic).
      await new Promise((r) => setTimeout(r, 200));
      res = await this.fetchImpl(url);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`GeckoTerminal ${label} failed (${res.status}): ${detail}`);
    }
    return res.json();
  }

  /**
   * Resolve the best Base pool for the tokenA/tokenB pair. Lists tokenA's pools
   * (already sorted by liquidity + volume) and picks the first whose other side
   * is tokenB. Returns the pool address or null when no matching pool exists.
   */
  async resolvePool(tokenA: string, tokenB: string): Promise<string | null> {
    const a = tokenA.toLowerCase();
    const b = tokenB.toLowerCase();
    const url = `${this.baseUrl}/networks/${NETWORK}/tokens/${tokenA}/pools`;
    const j = await this.getJson(url, 'resolvePool');

    const pools = Array.isArray(j?.data) ? j.data : [];
    for (const pool of pools) {
      const baseId = lowerAddr(pool?.relationships?.base_token?.data?.id);
      const quoteId = lowerAddr(pool?.relationships?.quote_token?.data?.id);
      const sides = new Set([baseId, quoteId]);
      if (sides.has(a) && sides.has(b)) {
        const addr = pool?.attributes?.address;
        if (typeof addr === 'string' && addr) return addr;
      }
    }
    return null;
  }

  /**
   * Fetch OHLCV bars for a pool. Input rows are `[ts,o,h,l,c,v]`, newest-first;
   * returned bars are reversed to oldest-first for charting.
   */
  async getOhlcv(
    pool: string,
    timeframe: Timeframe,
    opts: GetOhlcvOptions = {},
  ): Promise<OhlcvBar[]> {
    const params = new URLSearchParams({ currency: 'usd' });
    if (opts.aggregate != null) params.set('aggregate', String(opts.aggregate));
    if (opts.limit != null) params.set('limit', String(opts.limit));
    const url = `${this.baseUrl}/networks/${NETWORK}/pools/${pool}/ohlcv/${timeframe}?${params.toString()}`;
    const j = await this.getJson(url, 'getOhlcv');

    const rows: unknown[] = j?.data?.attributes?.ohlcv_list ?? [];
    const bars = rows
      .filter((row): row is number[] => Array.isArray(row) && row.length >= 6)
      .map((row) => ({
        t: Number(row[0]),
        o: Number(row[1]),
        h: Number(row[2]),
        l: Number(row[3]),
        c: Number(row[4]),
        v: Number(row[5]),
      }));
    // Input is newest-first; reverse to oldest-first.
    return bars.reverse();
  }

  /**
   * Fetch recent trades for a pool, optionally filtered by minimum USD volume.
   */
  async getTrades(pool: string, opts: GetTradesOptions = {}): Promise<GeckoTrade[]> {
    const params = new URLSearchParams();
    if (opts.minUsd != null) {
      params.set('trade_volume_in_usd_greater_than', String(opts.minUsd));
    }
    const qs = params.toString();
    const url = `${this.baseUrl}/networks/${NETWORK}/pools/${pool}/trades${qs ? `?${qs}` : ''}`;
    const j = await this.getJson(url, 'getTrades');

    const rows = Array.isArray(j?.data) ? j.data : [];
    return rows.map((row: any) => {
      const a = row?.attributes ?? {};
      return {
        id: String(row?.id ?? ''),
        block: Number(a.block_number),
        ts: String(a.block_timestamp ?? ''),
        txHash: String(a.tx_hash ?? ''),
        maker: String(a.tx_from_address ?? ''),
        fromToken: String(a.from_token_address ?? ''),
        toToken: String(a.to_token_address ?? ''),
        fromAmount: String(a.from_token_amount ?? ''),
        toAmount: String(a.to_token_amount ?? ''),
        usd: Number(a.volume_in_usd),
        kind: a.kind === 'sell' ? 'sell' : 'buy',
      } satisfies GeckoTrade;
    });
  }
}
