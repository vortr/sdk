/**
 * DefiLlama coin-price client (Base network). Free, no API key required.
 *
 * `fetchImpl` is injectable so the client is unit-testable without network.
 */

const BASE_URL = 'https://coins.llama.fi';
const CHAIN_PREFIX = 'base';

type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<any>;
  text(): Promise<string>;
}>;

export interface TokenPrice {
  price: number;
  symbol?: string;
  decimals?: number;
  confidence?: number;
}

export interface DefiLlamaOptions {
  fetchImpl?: FetchLike;
  baseUrl?: string;
}

export class DefiLlamaClient {
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;

  constructor(opts: DefiLlamaOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    this.baseUrl = opts.baseUrl ?? BASE_URL;
  }

  /**
   * Current USD prices for the given Base token addresses, keyed by the
   * lowercased token address (the `base:` prefix is stripped). Tokens DefiLlama
   * has no price for are silently omitted from the result.
   */
  async getPrices(addresses: string[]): Promise<Record<string, TokenPrice>> {
    const out: Record<string, TokenPrice> = {};
    if (addresses.length === 0) return out;

    const ids = addresses.map((a) => `${CHAIN_PREFIX}:${a}`).join(',');
    const url = `${this.baseUrl}/prices/current/${ids}`;
    const res = await this.fetchImpl(url);
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`DefiLlama getPrices failed (${res.status}): ${detail}`);
    }

    const j = await res.json();
    const coins = j?.coins ?? {};
    for (const [key, value] of Object.entries(coins)) {
      const v = value as Partial<TokenPrice> | undefined;
      if (!v || typeof v.price !== 'number') continue;
      const idx = key.indexOf(':');
      const addr = (idx >= 0 ? key.slice(idx + 1) : key).toLowerCase();
      out[addr] = {
        price: v.price,
        ...(v.symbol != null ? { symbol: v.symbol } : {}),
        ...(v.decimals != null ? { decimals: v.decimals } : {}),
        ...(v.confidence != null ? { confidence: v.confidence } : {}),
      };
    }
    return out;
  }
}
