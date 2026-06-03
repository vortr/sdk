export interface McpConfig { apiBase: string; apiSecret: string }

export function readConfig(source: Record<string, string | undefined> = process.env): McpConfig {
  const apiBase = source.VORTR_API_BASE;
  const apiSecret = source.VORTR_API_SECRET;
  if (!apiBase) throw new Error('Missing required env var: VORTR_API_BASE (set it to the deployed Vortr URL)');
  if (!apiSecret) throw new Error('Missing required env var: VORTR_API_SECRET');
  if (/(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)/i.test(apiBase)) {
    // Allowed for local development against a locally-running web app. Warn on
    // stderr (NOT stdout — stdout is the JSON-RPC channel) so it isn't shipped
    // to production by accident.
    console.error(
      '[vortr-mcp] warning: VORTR_API_BASE points at localhost — fine for local dev; use the deployed URL in production.',
    );
  }
  return { apiBase: apiBase.replace(/\/$/, ''), apiSecret };
}
