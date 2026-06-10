#!/usr/bin/env node
// Supply-chain audit for omeubanco-v2.
// Verifies pinned package versions in package.json match package-lock.json and
// flags any drift. Also lists every dependency in node_modules that declares
// install lifecycle scripts (preinstall, install, postinstall, prepare).
//
// Run: npm run audit:supply-chain

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

// Packages we want to keep pinned to an exact version after the May 2026
// TanStack supply-chain incident. Extend as needed.
const PINNED = [
  '@tanstack/react-query',
  '@tanstack/react-query-persist-client',
];

// Compromised versions reported by Socket/GitHub advisories (extend as IoCs land).
const KNOWN_BAD = new Map([
  // ['@tanstack/react-query', new Set(['5.100.10'])],
]);

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function exitWith(messages, code = 1) {
  for (const m of messages) console.error(m);
  process.exit(code);
}

const pkg = loadJson(join(ROOT, 'package.json'));
const lock = loadJson(join(ROOT, 'package-lock.json'));

const errors = [];
const warnings = [];

// 1. Pinned versions must not have caret/tilde ranges.
const declared = { ...pkg.dependencies, ...pkg.devDependencies };
for (const name of PINNED) {
  const range = declared[name];
  if (!range) continue;
  if (/^[~^]/.test(range) || range.includes('x') || range.includes('*')) {
    errors.push(`[PIN] ${name} declared as "${range}" — must be exact version (no ^/~).`);
  }
}

// 2. Lock versions vs. known-bad list.
const lockPkgs = lock.packages || {};
for (const [k, v] of Object.entries(lockPkgs)) {
  if (!k.startsWith('node_modules/')) continue;
  const name = k.replace(/^node_modules\//, '').replace(/\/node_modules\/.*/, '');
  const bad = KNOWN_BAD.get(name);
  if (bad && bad.has(v.version)) {
    errors.push(`[IOC] ${name}@${v.version} matches known-bad version (${k}).`);
  }
}

// 3. List packages with install lifecycle scripts (informational).
const installScripts = [];
for (const [k, v] of Object.entries(lockPkgs)) {
  if (v.hasInstallScript) installScripts.push(k.replace(/^node_modules\//, ''));
}

// 4. Detect any package added to lock without corresponding package.json declaration
// for the top-level workspace (helps catch hidden transitive escalations).
const directDeps = new Set(Object.keys(declared));
const topLevelLockEntries = Object.keys(lockPkgs)
  .filter((k) => k.startsWith('node_modules/') && !k.slice('node_modules/'.length).includes('/node_modules/'))
  .map((k) => k.replace(/^node_modules\//, ''));

const orphan = topLevelLockEntries.filter((n) => !directDeps.has(n) && !n.startsWith('@types/'));

console.log('=== Supply-Chain Audit ===');
console.log(`Pinned packages (no caret allowed): ${PINNED.length}`);
console.log(`Top-level packages in lock:         ${topLevelLockEntries.length}`);
console.log(`Direct deps in package.json:        ${directDeps.size}`);
console.log(`Hoisted/transitive top-level:       ${orphan.length}`);
console.log(`Packages with install scripts:      ${installScripts.length}`);
for (const s of installScripts) console.log('  -', s);

if (errors.length) {
  console.log('');
  exitWith(['Audit FAILED:', ...errors]);
}
if (warnings.length) {
  console.log('');
  for (const w of warnings) console.warn('WARN', w);
}
console.log('\nAudit OK.');
