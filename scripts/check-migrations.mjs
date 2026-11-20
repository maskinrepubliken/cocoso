// Checks that scripts/migrations/ORDER and the scripts in that folder agree:
// every *.mongosh.js is listed exactly once, every listed script exists, and
// the only flag is `manual`. A deploy runs the scripts from ORDER, so one
// that is not listed would silently never run.
//
//   node scripts/check-migrations.mjs          # check
//   node scripts/check-migrations.mjs --list   # print all of them, in order

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
const NAME = /^[A-Za-z0-9._-]+\.mongosh\.js$/;

const errors = [];
const entries = [];
readFileSync(join(dir, 'ORDER'), 'utf8')
  .split('\n')
  .forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const [name, flag, ...rest] = line.split(/\s+/);
    const where = `ORDER:${index + 1}`;
    if (!NAME.test(name))
      errors.push(`${where}: "${name}" is not a <name>.mongosh.js file name`);
    if (rest.length || (flag && flag !== 'manual'))
      errors.push(`${where}: the only flag is "manual"`);
    if (entries.some((entry) => entry.name === name))
      errors.push(`${where}: ${name} is listed twice`);
    entries.push({ name, manual: flag === 'manual' });
  });

const files = readdirSync(dir).filter((file) => file.endsWith('.mongosh.js'));
for (const file of files) {
  if (!entries.some((entry) => entry.name === file)) {
    errors.push(
      `${file} is not in scripts/migrations/ORDER; add it at the end`
    );
  }
}
for (const { name, manual } of entries) {
  if (!files.includes(name)) {
    errors.push(`ORDER lists ${name}, which is not in scripts/migrations/`);
  } else if (
    manual &&
    !/\bAPPLY\b/.test(readFileSync(join(dir, name), 'utf8'))
  ) {
    errors.push(
      `${name} is manual but never reads APPLY, so it has no dry run`
    );
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`✗ ${error}`));
  process.exit(1);
}
if (process.argv.includes('--list')) {
  entries.forEach((entry) => console.log(entry.name));
} else {
  const manual = entries.filter((entry) => entry.manual).length;
  console.log(`✓ ${entries.length} migrations in order (${manual} manual)`);
}
