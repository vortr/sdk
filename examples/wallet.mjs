#!/usr/bin/env node
// Autonomous swap via the @vortr/wallet local signer (MCP, stdio).
//
//   VORTR_SIGNER_KEY=0x...  node examples/wallet.mjs            # quote $1 ETH -> USDC (dry run)
//   VORTR_SIGNER_KEY=0x...  node examples/wallet.mjs --execute  # actually broadcast on Base
//
// @vortr/wallet holds your EOA key locally (env, never in chat), fetches keyless
// calldata from Vortr, and signs + broadcasts on Base after a per-swap confirm.
// Vortr never holds the key. Use a HOT WALLET with a small balance.
//
// Flow: wallet_address -> prepare_swap -> (confirm) -> execute_swap -> swap_status.

const KEY = process.env.VORTR_SIGNER_KEY;
if (!KEY) {
  console.log(`
This example needs a signing key for the local @vortr/wallet signer.

  1) npm install   (pulls @modelcontextprotocol/sdk; @vortr/wallet is fetched via npx)
  2) export VORTR_SIGNER_KEY=0x...    # a HOT wallet with a small Base balance — never your main key
  3) node examples/wallet.mjs         # dry run (quote only)
     node examples/wallet.mjs --execute   # broadcast on Base

The key stays in this local process; it never reaches Vortr.`);
  process.exit(0);
}

// Only import the MCP SDK once we actually intend to connect.
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

const execute = process.argv.includes('--execute');

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@vortr/wallet'],
  env: { ...process.env, VORTR_SIGNER_KEY: KEY },
});
const client = new Client({ name: 'vortr-example', version: '1.0.0' });

/** Call a @vortr/wallet tool and return its parsed text result (throws on error). */
async function call(name, args = {}) {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content?.[0]?.text ?? '';
  if (r.isError) throw new Error(text);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

try {
  await client.connect(transport);

  const addr = await call('wallet_address');
  console.log(`\nSigner: ${typeof addr === 'string' ? addr : addr.address}\n`);

  // Quote $1 of ETH -> USDC. summary has both `buy` (expected) and `buyMin` (floor).
  const { confirm_token, summary } = await call('prepare_swap', { sellToken: 'ETH', buyToken: 'USDC', usd: 1 });
  console.log(`prepare_swap: ≈ ${summary?.buy?.amount ?? '?'} ${summary?.buy?.token ?? ''} (min ${summary?.buyMin?.amount ?? '?'})`);

  if (!execute) {
    console.log(`\nDry run — pass --execute to broadcast on Base.\n`);
  } else {
    const res = await call('execute_swap', { confirm_token });
    console.log(`execute_swap: ${typeof res === 'string' ? res : JSON.stringify(res)}`);
    if (res?.hash) {
      const status = await call('swap_status', { hash: res.hash });
      console.log(`swap_status: ${typeof status === 'string' ? status : JSON.stringify(status)}`);
    }
  }
} finally {
  await client.close().catch(() => {});
}
