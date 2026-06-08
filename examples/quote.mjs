#!/usr/bin/env node
// Keyless live swap quote from Vortr's hosted MCP — no install, no API key.
//
//   node examples/quote.mjs                  # 0.01 ETH -> USDC
//   node examples/quote.mjs WETH USDC 0.01
//   node examples/quote.mjs USDC DEGEN 5 0xYourWallet
//
// Hits the public Streamable-HTTP MCP at https://www.vortr.xyz/mcp (stateless,
// SSE-framed JSON-RPC) and calls search_tokens -> get_quote -> build_swap.
// Vortr NEVER signs: build_swap returns the ERC-5792 calldata + a sign_url you
// open in your own wallet (or run @vortr/wallet to sign locally). The taker is
// just whose address the swap is built for — replace it with your own.

const MCP = 'https://www.vortr.xyz/mcp';

/** Call one Vortr MCP tool and return its parsed result (throws on tool error). */
async function callTool(name, args) {
  const res = await fetch(MCP, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } }),
  });
  // The stateless server answers with one SSE `data:` line carrying JSON-RPC.
  const line = (await res.text()).split('\n').find((l) => l.startsWith('data:'));
  if (!line) throw new Error('unexpected MCP response (no data line)');
  const { result, error } = JSON.parse(line.slice(5));
  if (error) throw new Error(error.message);
  const text = result.content?.[0]?.text ?? '';
  if (result.isError) throw new Error(text);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  const [sellSym = 'ETH', buySym = 'USDC', human = '0.01', taker = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'] =
    process.argv.slice(2);

  // 1) resolve symbols -> { address, decimals } via the Base registry
  const sell = (await callTool('search_tokens', { query: sellSym })).tokens?.[0];
  const buy = (await callTool('search_tokens', { query: buySym })).tokens?.[0];
  if (!sell) throw new Error(`unknown sell token "${sellSym}" — try search_tokens, e.g. ETH, USDC, cbBTC, DEGEN`);
  if (!buy) throw new Error(`unknown buy token "${buySym}" — try search_tokens, e.g. ETH, USDC, cbBTC, DEGEN`);

  // 2) scale the human amount to BASE UNITS (exact-input; up to 6 dp of precision)
  const amount = ((BigInt(Math.round(Number(human) * 1e6)) * 10n ** BigInt(sell.decimals)) / 1_000_000n).toString();

  console.log(`\nQuoting ${human} ${sell.symbol} -> ${buy.symbol} on Base (taker ${taker.slice(0, 8)}…)\n`);

  // 3) live 0x quote (read-only)
  const q = await callTool('get_quote', { sellToken: sell.address, buyToken: buy.address, amount, taker });
  const fmt = (v, d) => (Number(v) / 10 ** d).toLocaleString(undefined, { maximumFractionDigits: 6 });
  console.log(`  ≈ ${fmt(q.buyAmount, buy.decimals)} ${buy.symbol}   (min ${fmt(q.minBuyAmount, buy.decimals)} after slippage)`);
  console.log(`  route: ${q.route?.fills?.map((f) => f.source).join(' + ') || 'n/a'}`);

  // 4) build the approve+swap payload + a sign_url — you sign it, Vortr never does
  const b = await callTool('build_swap', { sellToken: sell.address, buyToken: buy.address, amount, taker });
  console.log(`\n  build_swap -> ${b.payload?.calls?.length ?? 0} call(s) (approve + swap)`);
  console.log(`  sign in your own wallet:\n  ${b.sign_url}\n`);
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}\n`);
  process.exit(1);
});
