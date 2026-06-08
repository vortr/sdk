#!/usr/bin/env node
// sync-mirrors.mjs — push read-only mirrors of packages/{mcp,wallet} to the
// standalone repos vortr/mcp + vortr/wallet.
//
// WHY local (not CI): no PAT to expire, no external action to drift, failures are
// loud (you see them), and it reuses the gh auth you already release with. Run it
// right after a release (the one extra command in the release ritual):
//
//   node scripts/sync-mirrors.mjs      # gh must be authed with push to vortr/{mcp,wallet}
//
// Snapshot model: each mirror gets the package's CURRENT source (no build
// artifacts) + a read-only banner, committed and tagged with the package version.
// Mirrors are read-only — contributions + issues live in vortr/sdk.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, rmSync, cpSync, mkdtempSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';

const ORG = 'vortr';
const PKGS = ['mcp', 'wallet'];
const AUTHOR = { name: 'vortr-labs', email: '290630080+vortr-labs@users.noreply.github.com' };
const CRED = '!/usr/local/bin/gh auth git-credential';
// Skip build output + deps + nested VCS; everything else (src, tests, configs, docs) is source.
const EXCLUDE = /^(node_modules|dist|\.turbo)(\/|$)|\.tsbuildinfo$|^\.git(\/|$)/;

const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const shOk = (cmd, cwd) => {
  try { sh(cmd, cwd); return true; } catch { return false; }
};

const banner = (pkg) =>
  `> **📦 Read-only mirror** of [\`${ORG}/sdk\`](https://github.com/${ORG}/sdk) → \`packages/${pkg}\`.\n` +
  `> Install: \`npm i @${ORG}/${pkg}\` · issues & PRs: **[${ORG}/sdk](https://github.com/${ORG}/sdk)** · auto-synced on release.\n\n---\n\n`;

function syncOne(pkg) {
  const pkgDir = join(process.cwd(), 'packages', pkg);
  const version = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version;
  const tmp = mkdtempSync(join(tmpdir(), `vortr-mirror-${pkg}-`));
  console.log(`\n▸ @${ORG}/${pkg}@${version} → ${ORG}/${pkg}`);

  sh(`git clone --quiet https://github.com/${ORG}/${pkg}.git "${tmp}"`);
  sh(`git config user.name "${AUTHOR.name}"`, tmp);
  sh(`git config user.email "${AUTHOR.email}"`, tmp);
  sh(`git config credential.helper '${CRED}'`, tmp);
  shOk('git checkout -B main', tmp); // handles a freshly-created empty repo

  // Replace the mirror's working tree (keep .git) with the current package source.
  for (const entry of readdirSync(tmp)) if (entry !== '.git') rmSync(join(tmp, entry), { recursive: true, force: true });
  cpSync(pkgDir, tmp, {
    recursive: true,
    filter: (src) => {
      const rel = relative(pkgDir, src).split(sep).join('/');
      return rel === '' || !EXCLUDE.test(rel);
    },
  });

  // Prepend the read-only banner to the README.
  const readmePath = join(tmp, 'README.md');
  let readme = '';
  try { readme = readFileSync(readmePath, 'utf8'); } catch {}
  writeFileSync(readmePath, banner(pkg) + readme);

  sh('git add -A', tmp);
  const hasHead = shOk('git rev-parse HEAD', tmp);
  const noChange = hasHead && shOk('git diff --cached --quiet', tmp);
  if (noChange) {
    console.log('  no source changes — skipping commit');
  } else {
    sh(`git commit --quiet -m "release: @${ORG}/${pkg}@${version} (synced from ${ORG}/sdk)"`, tmp);
    console.log('  committed snapshot');
  }
  if (!sh(`git tag -l v${version}`, tmp)) sh(`git tag v${version}`, tmp);
  sh('git push --quiet -u origin main', tmp);
  sh('git push --quiet origin --tags', tmp);
  console.log(`  pushed main + v${version}`);
  rmSync(tmp, { recursive: true, force: true });
}

const who = shOk('gh api user --jq .login') ? sh('gh api user --jq .login') : '';
if (who !== 'vortr-labs') {
  console.error(`gh active account is "${who || 'unknown'}", need vortr-labs.\nRun: gh auth switch -u vortr-labs`);
  process.exit(1);
}
console.log(`Syncing mirrors as ${who}…`);
for (const pkg of PKGS) syncOne(pkg);
console.log('\n✓ mirrors synced');
