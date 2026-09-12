#!/usr/bin/env node
/**
 * Type-check ratchet.
 *
 * The codebase was never type-checked against real Meteor 3 types, so `tsc`
 * reports a large backlog of pre-existing errors. Rather than hide them with a
 * loose config, this script keeps `tsconfig.json` strict and compares the
 * current error set against a committed baseline:
 *
 *   npm run typecheck            fail only on errors that are NOT in the baseline
 *   npm run typecheck:update     rewrite the baseline with the current error set
 *
 * Errors are keyed by file + code + message (line numbers are ignored so that
 * unrelated edits above an error do not count as "new"). When you fix errors,
 * run `typecheck:update` so the baseline only ever shrinks.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BASELINE_PATH = resolve('typecheck-baseline.json');
const update = process.argv.includes('--update');

const tsc = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsc', '--noEmit', '-p', 'tsconfig.json', '--pretty', 'false'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
);
const output = `${tsc.stdout || ''}${tsc.stderr || ''}`;

const errorLine = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const current = new Map();
for (const line of output.split('\n')) {
  const match = line.match(errorLine);
  if (!match) continue;
  const [, file, , , code, message] = match;
  const key = `${file} | ${code} | ${message}`;
  current.set(key, (current.get(key) || 0) + 1);
}

if (update) {
  const sorted = Object.fromEntries(
    [...current.entries()].sort(([a], [b]) => a.localeCompare(b))
  );
  writeFileSync(BASELINE_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Baseline written: ${current.size} distinct errors.`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  : {};

const newErrors = [];
for (const [key, count] of current) {
  const allowed = baseline[key] || 0;
  if (count > allowed) newErrors.push(`${key}  (x${count - allowed})`);
}
let fixed = 0;
for (const [key, count] of Object.entries(baseline)) {
  const now = current.get(key) || 0;
  if (now < count) fixed += count - now;
}

const total = [...current.values()].reduce((a, b) => a + b, 0);
console.log(`tsc: ${total} errors total, ${newErrors.length} not in baseline.`);
if (fixed > 0) {
  console.log(
    `${fixed} baseline error(s) no longer occur. Run \`npm run typecheck:update\` to lock that in.`
  );
}
if (newErrors.length > 0) {
  console.log('\nNew type errors:');
  for (const line of newErrors) console.log(`  ${line}`);
  process.exit(1);
}
