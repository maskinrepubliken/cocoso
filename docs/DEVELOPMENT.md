# Development guide

## Prerequisites

- Node.js 22 (Meteor 3.5 bundles its own, but the npm scripts run with yours)
- [Meteor](https://docs.meteor.com/about/install.html) 3.5.x
- MongoDB is started by `meteor run` in development; nothing to install

## First run

```bash
git clone https://github.com/lyret/pioneer-cocoso.git
cd pioneer-cocoso
meteor npm install
cp changethis.settings.json private/settings.json   # then edit it, see docs/CONFIGURATION.md
meteor run --settings private/settings.json --port 3000
```

On first visit with an empty database the setup wizard creates the first
admin account and the site (name and contact details). Add the
municipality's locations afterwards under Admin → Places.

## Scripts

| Command                           | What it does                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm start`                       | `meteor run --settings private/settings.json`                                              |
| `npm run lint` / `lint:fix`       | ESLint 9 flat config (`eslint.config.mts`). Zero errors is enforced; warnings are tracked. |
| `npm run typecheck`               | `tsc` against a committed baseline of known errors. Fails only on **new** type errors.     |
| `npm run typecheck:update`        | Rewrite `typecheck-baseline.json` after fixing errors so the baseline only shrinks.        |
| `npm run check:i18n`              | Every language must have exactly the English key set.                                      |
| `npm run check:deps`              | [knip](https://knip.dev): unused files, exports and dependencies.                          |
| `npm run check`                   | typecheck + i18n; what CI runs together with lint.                                         |
| `npm run format` / `format:check` | Prettier.                                                                                  |
| `npm run analyze`                 | Production build with the bundle visualizer.                                               |
| `npm run release*`                | `standard-version` changelog and tag. See below.                                           |

There are no automated tests yet. The lint, typecheck and i18n checks run in
GitHub Actions on every push and pull request (`.github/workflows/ci.yml`).

## Conventions

**Language.** New code is TypeScript. The UI layer is ~93% `.tsx`; the API
layer is still mostly JavaScript. When you touch a `.js` file in
`imports/api`, converting it is welcome but not required.

**Imports.** Use absolute paths from the project root (`/imports/ui/core`,
`/imports/api/_utils/shared`). Import UI primitives from the `core` barrel.
Meteor compiles JSX with the classic runtime, so every file with JSX needs
`import React from 'react'`; ESLint enforces it.

**Methods.** Every method must, in this order: `check()` its arguments,
resolve the user with `Meteor.userAsync()`, check the role with
`user.roles.js` (it takes the user id only), and query by `_id`. Throw
`new Meteor.Error(code, reason)` with a kebab-case code; never pass an Error
object as the code. Strip `_id` and author fields from client-supplied
objects before `$set`. Listing methods that can be scoped to a place take an
optional `locationId` and use `locationSelector()` from `_utils/shared`.

**Data fetching.** Route loaders in `imports/loaders.js` for page data,
`call()` from `imports/api/_utils/shared.ts` for mutations, jotai atoms for
global state. Avoid new publications unless the data must be realtime.

**Translations.** Every user-facing string goes through `useTranslation`.
Add keys to `public/i18n/en/*.yml` first, then to `sv` and `tr`;
`npm run check:i18n` fails otherwise.

**Styling.** Stitches `styled()` and the `css` prop on core components. Theme
colours are CSS variables (`var(--cocoso-colors-theme-500)`) generated per
host in `globalStylesManager.ts`. Do not add new global CSS to
`client/main.css` unless it targets third-party markup.

**Email HTML.** Wrap user-supplied values in `escapeHtml()` before
interpolating into template strings.

## Type checking

`tsc` had never been run against real Meteor 3 types before September 2026,
so the codebase carries a backlog of pre-existing type errors. Rather than
weaken `tsconfig.json`, `scripts/typecheck-baseline.mjs` records them in
`typecheck-baseline.json` and CI fails only on errors that are not in the
baseline. When you fix some, run `npm run typecheck:update` and commit the
smaller baseline.

The largest remaining groups are implicit `any` parameters in JSX
components, `useState(null)` and `atom(null)` without a type argument, and
loosely typed loader data. Good places to start are listed in
[AUDIT.md](AUDIT.md).

## TypeScript migration status

| Area              | JS files | TS files |
| ----------------- | -------- | -------- |
| `imports/ui`      | 33       | 237      |
| `imports/api`     | 65       | 13       |
| `imports/startup` | 8        | 2        |

Remaining JavaScript in the UI is concentrated in `pages/admin/listing/*`,
the `*FormFields.js` definitions and a few constants modules, all mechanical
conversions. The API layer is the real remaining work; convert a module when
you are in it for another reason.

## Releases

`npm run release` uses `standard-version`, which builds `CHANGELOG.md` from
Conventional Commit messages (`feat:`, `fix:`, `chore:` …). The history has
not followed that format consistently, which is why the changelog is thin.
If you want a useful changelog, write conventional messages from now on; if
not, `CHANGELOG.md` and the release scripts can be dropped.

## Debugging

- `meteor shell` attaches a REPL to the running server.
- Server logs are prefixed per subsystem: `[media]`, `[oauth]`, `[i18n]`.
- Hydration warnings in the browser console almost always mean the server
  and client rendered different languages or different data; check the
  request language first.
