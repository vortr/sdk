#!/usr/bin/env node
// Token-registry verifier — the cross-check step for the add-a-token flow.
//
// CoinGecko seeds the candidate address (manual). This script then corroborates
// it against TWO independent sources before it ships:
//   1. Uniswap token list (tokens.uniswap.org, Base / chainId 8453) — if Uniswap
//      lists the token, its address MUST match ours. A symbol that exists in
//      Uniswap at a DIFFERENT address is a hard MISMATCH (our entry may be wrong).
//   2. On-chain symbol()/decimals() (eth_call on a Base RPC) — the trustless
//      check: the contract itself must report the symbol + decimals we store.
//
// Uniswap is a CORROBORATING source, not a gate: it doesn't list every Base token
// (BRETT/DEGEN/cbADA etc. may be absent) — "not listed" is fine, only a CONFLICT
// (different address for the same symbol) or an on-chain mismatch fails the run.
//
// Usage:
//   node packages/core/scripts/verify-tokens.mjs              # audit the whole registry
//   node packages/core/scripts/verify-tokens.mjs 0xNewToken…  # vet a candidate before adding
//   BASE_RPC_URL=https://… node …/verify-tokens.mjs           # use a private RPC (default mainnet.base.org)

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const UNISWAP_LIST = 'https://tokens.uniswap.org';
const BASE_CHAIN_ID = 8453;
const SEL = { symbol: '0x95d89b41', decimals: '0x313ce567' };
const __dir = dirname(fileURLToPath(import.meta.url));

const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', reset: '\x1b[0m' };
const ok = (s) => `${C.green}${s}${C.reset}`;
const bad = (s) => `${C.red}${s}${C.reset}`;
const warn = (s) => `${C.yellow}${s}${C.reset}`;

/** Parse BASE_TOKENS out of registry.ts (no TS build needed). */
async function readRegistry() {
  const src = await readFile(join(__dir, '..', 'src', 'tokens', 'registry.ts'), 'utf8');
  const tokens = [];
  for (const line of src.split('\n')) {
    const m = line.match(
      /address:\s*(NATIVE_TOKEN_ADDRESS|'(0x[0-9a-fA-F]{40})')\s*,\s*symbol:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'\s*,\s*decimals:\s*(\d+)/,
    );
    if (!m) continue;
    const native = m[1] === 'NATIVE_TOKEN_ADDRESS';
    tokens.push({ native, address: native ? null : m[2], symbol: m[3], name: m[4], decimals: Number(m[5]) });
  }
  return tokens;
}

async function fetchUniswapBase() {
  const res = await fetch(UNISWAP_LIST);
  if (!res.ok) throw new Error(`Uniswap list ${res.status}`);
  const { tokens } = await res.json();
  const byAddr = new Map();
  const bySym = new Map();
  for (const t of tokens) {
    if (t.chainId !== BASE_CHAIN_ID) continue;
    byAddr.set(t.address.toLowerCase(), t);
    bySym.set(t.symbol.toLowerCase(), t);
  }
  return { byAddr, bySym, count: byAddr.size };
}

async function ethCall(to, data) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
  });
  const { result, error } = await res.json();
  if (error) throw new Error(error.message);
  return result;
}

/** Decode an ABI-encoded string return, with a bytes32 fallback for legacy tokens. */
function decodeString(hex) {
  const h = (hex || '').replace(/^0x/, '');
  if (h.length < 128) return Buffer.from(h, 'hex').toString('utf8').replace(/\0+$/g, '').trim();
  const len = parseInt(h.slice(64, 128), 16);
  return Buffer.from(h.slice(128, 128 + len * 2), 'hex').toString('utf8').replace(/\0+$/g, '').trim();
}

async function onchain(address) {
  const [sym, dec] = await Promise.all([ethCall(address, SEL.symbol), ethCall(address, SEL.decimals)]);
  const symbol = decodeString(sym);
  // A no-code address (EOA) or non-ERC-20 returns empty data for symbol() — reject it.
  if (!symbol) throw new Error('no ERC-20 symbol() at this address (not a token contract?)');
  return { symbol, decimals: parseInt((dec || '0x0').slice(2), 16) || 0 };
}

/** Cross-check one token against Uniswap + the chain. Returns a verdict row. */
async function verify(t, uni) {
  const row = { symbol: t.symbol, address: t.address, fail: false, uni: '', chain: '' };
  if (t.native) {
    row.uni = C.dim + 'native (ETH)' + C.reset;
    row.chain = C.dim + 'native — no contract' + C.reset;
    return row;
  }
  // Uniswap corroboration
  const byA = uni.byAddr.get(t.address.toLowerCase());
  const byS = uni.bySym.get(t.symbol.toLowerCase());
  if (byA) {
    row.uni =
      byA.symbol.toLowerCase() === t.symbol.toLowerCase()
        ? ok('✓ match')
        : ((row.fail = true), bad(`✗ symbol conflict (uniswap=${byA.symbol})`));
  } else if (byS) {
    row.fail = true;
    row.uni = bad(`✗ MISMATCH — uniswap has ${t.symbol} @ ${byS.address.slice(0, 10)}…`);
  } else {
    row.uni = warn('— not listed (ok)');
  }
  // On-chain trustless check
  try {
    const oc = await onchain(t.address);
    const symOk = oc.symbol.toLowerCase() === t.symbol.toLowerCase();
    const decOk = oc.decimals === t.decimals;
    row.chain =
      symOk && decOk
        ? ok(`✓ ${oc.symbol}/${oc.decimals}`)
        : ((row.fail = true), bad(`✗ chain=${oc.symbol}/${oc.decimals} vs registry=${t.symbol}/${t.decimals}`));
  } catch (e) {
    row.fail = true;
    row.chain = bad(`✗ rpc: ${e.message}`);
  }
  return row;
}

async function main() {
  const arg = process.argv[2];
  const uni = await fetchUniswapBase();
  console.log(`${C.dim}Uniswap Base list: ${uni.count} tokens · RPC: ${RPC}${C.reset}\n`);

  let tokens;
  if (arg) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(arg)) {
      console.error(bad(`Not an address: ${arg}`));
      process.exit(2);
    }
    // Candidate mode: read its on-chain identity, then verify as if adding it.
    const oc = await onchain(arg);
    console.log(`Candidate ${arg}\n  on-chain: ${oc.symbol} / ${oc.decimals} decimals`);
    tokens = [{ native: false, address: arg, symbol: oc.symbol, name: oc.symbol, decimals: oc.decimals }];
  } else {
    tokens = await readRegistry();
    console.log(`Auditing ${tokens.length} registry tokens:\n`);
  }

  const rows = [];
  for (const t of tokens) rows.push(await verify(t, uni));

  const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
  console.log(pad('SYMBOL', 9) + pad('UNISWAP', 42) + 'ON-CHAIN');
  for (const r of rows) console.log(pad(r.symbol, 9) + pad(r.uni, 42 + (r.uni.length - r.uni.replace(/\x1b\[[0-9;]*m/g, '').length)) + r.chain);

  const fails = rows.filter((r) => r.fail);
  const verified = rows.filter((r) => !r.native && r.uni.includes('✓ match')).length;
  const notListed = rows.filter((r) => r.uni.includes('not listed')).length;
  console.log(
    `\n${fails.length ? bad(`✗ ${fails.length} FAILED`) : ok('✓ all clear')} · ` +
      `${verified} Uniswap-corroborated · ${notListed} not-listed-by-uniswap (ok) · ${rows.length} total`,
  );
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(bad(`error: ${e.message}`));
  process.exit(2);
});
