import type { McpConfig } from './config.js';

const EXPECTED_VERSION = '1';

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{
  ok: boolean; status: number; headers: { get(name: string): string | null }; json(): Promise<any>; text(): Promise<string>;
}>;

export class ApiClient {
  constructor(private readonly cfg: McpConfig, private readonly fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike) {}

  private assertVersion(res: { headers: { get(name: string): string | null } }): void {
    const version = res.headers.get('x-vortr-api-version');
    if (version && version !== EXPECTED_VERSION) {
      throw new Error(`Vortr API version mismatch: server ${version}, client ${EXPECTED_VERSION}. Update @vortr/mcp.`);
    }
  }

  private async post(path: string, payload: unknown): Promise<any> {
    const res = await this.fetchImpl(`${this.cfg.apiBase}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-vortr-secret': this.cfg.apiSecret },
      body: JSON.stringify(payload),
    });
    this.assertVersion(res);
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Vortr API ${path} failed (${res.status}): ${detail}`);
    }
    return res.json();
  }

  postQuote(params: unknown) { return this.post('/api/quote', params); }
  postBuildSwap(params: unknown) { return this.post('/api/build-swap', params); }

  async getPortfolio(address: string): Promise<any> {
    const res = await this.fetchImpl(`${this.cfg.apiBase}/api/portfolio?address=${encodeURIComponent(address)}`, {
      method: 'GET', headers: { 'x-vortr-secret': this.cfg.apiSecret },
    });
    this.assertVersion(res);
    if (!res.ok) throw new Error(`Vortr API /api/portfolio failed (${res.status})`);
    return res.json();
  }
}
