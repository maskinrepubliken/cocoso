#!/usr/bin/env node
/**
 * Translation parity check.
 *
 * Every namespace file in public/i18n/<lang>/*.yml must exist for every
 * language and contain the same set of keys as the English source. Keys that
 * exist only in a translation never resolve at runtime and hide silently, so
 * they are reported as errors too.
 *
 *   npm run check:i18n
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const ROOT = 'public/i18n';
const SOURCE = 'en';

function flatten(obj, prefix = '', out = new Set()) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else {
    out.add(prefix);
  }
  return out;
}

function loadNamespace(lang, file) {
  const raw = readFileSync(join(ROOT, lang, file), 'utf8');
  return flatten(yaml.load(raw) || {});
}

const languages = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const namespaces = readdirSync(join(ROOT, SOURCE)).filter((f) =>
  f.endsWith('.yml')
);

let problems = 0;
for (const lang of languages) {
  if (lang === SOURCE) continue;
  for (const file of namespaces) {
    let translated;
    try {
      translated = loadNamespace(lang, file);
    } catch {
      console.log(`✗ ${lang}/${file}: missing or unreadable`);
      problems += 1;
      continue;
    }
    const source = loadNamespace(SOURCE, file);
    const missing = [...source].filter((k) => !translated.has(k));
    const extra = [...translated].filter((k) => !source.has(k));
    for (const k of missing) console.log(`✗ ${lang}/${file}: missing "${k}"`);
    for (const k of extra)
      console.log(`✗ ${lang}/${file}: "${k}" does not exist in ${SOURCE}`);
    problems += missing.length + extra.length;
  }
}

if (problems === 0) {
  console.log(
    `✓ ${languages.length} languages × ${namespaces.length} namespaces in sync.`
  );
} else {
  console.log(`\n${problems} translation problem(s).`);
  process.exit(1);
}
