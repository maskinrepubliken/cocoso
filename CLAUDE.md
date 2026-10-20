# Cocoso — notes for AI assistants

Read `docs/ARCHITECTURE.md` and `docs/DEVELOPMENT.md` before making changes.
The short version:

- Meteor 3 + React 18 + MongoDB, one process serving one site (Tranemo
  kommun). The site's settings are the single document in `site`
  (`getSite()` on the server, `siteAtom` / the `siteDoc` route prop in the
  UI). There is no
  tenant or `host` field. The municipality is split into **locations**
  (`imports/api/locations`); content carries an optional `locationId`, and
  every location has pages under `/<slug>`. Build absolute links with
  `publicUrl()`, never from a hostname.
- All data access is through Meteor methods in `imports/api/<module>/*.methods.*`.
  New methods: `check()` args, `Meteor.userAsync()`, role check from
  `imports/api/users/user.roles.js` (user id only), `{ _id }` selectors,
  `new Meteor.Error('kebab-code', 'reason')`.
- JSX uses the classic runtime: every JSX file needs `import React from 'react'`.
- Uploads live on local disk (`imports/api/_utils/services/mediaStorage.ts`),
  served under `/media`. There is no S3 any more.
- Translations: `public/i18n/<lang>/<ns>.yml`; add English first, then sv.
- Feature flags live in `imports/api/_utils/features.ts`; groups and works
  are switched off. New code touching a section checks `isFeatureEnabled`
  (or `isMenuItemShown` for menu items), not just the menu's `isVisible`.
- Escape user input with `imports/api/_utils/escapeHtml.js` inside email HTML.

Before finishing any change run:

```bash
npm run lint && npm run typecheck && npm run check:i18n
```

`typecheck` compares against `typecheck-baseline.json`; only new errors fail.
If you fix existing errors, run `npm run typecheck:update` and commit the file.

## Git: work on `main` directly

Commit straight to `main` and push it (`git push origin main`). Do not create
feature branches, and do not switch the shared checkout to another branch; the
live site serves whatever is checked out, and it should always be `main`. If
this conflicts with a general instruction to branch first, this one wins for
this repository. Pull (`git pull --ff-only origin main`) before you start, and
keep commits small so parallel sessions don't trip over each other.

## Commit messages: write them for the changelog

Releases are cut with `npm run release` (standard-version), which generates
`CHANGELOG.md` from the commit messages since the previous release. A commit
that does not follow this format is **invisible in the changelog**, so every
commit must:

1. **Use a Conventional Commits subject:** `type(scope): what changed`, in the
   imperative, ≤ 72 characters, no trailing period.
   - Types that **appear in the changelog**: `feat` (new or changed behaviour a
     user or admin notices), `fix` (a bug), `perf`, `revert`.
   - Types that are **recorded but hidden**: `refactor`, `docs`, `style`, `test`,
     `build`, `ci`, `chore`, `i18n`. Use them honestly — do not label a refactor
     `feat` to make it show up.
   - `scope` is the area: `calendar`, `activities`, `groups`, `works`, `people`,
     `locations`, `auth`, `media`, `admin`, `i18n`, `settings`, … Omit it only
     for repo-wide changes.
2. **Always write a body** (blank line after the subject), except for trivial
   `chore`/`style` commits. It is the detailed description the changelog and
   future readers rely on — the subject alone is never enough. Cover:
   - **What** changed, as someone using the site would notice it.
   - **Why** — the problem, request or bug behind it.
   - **How**, where it is not obvious: notable implementation choices, data
     migrations or seed scripts to run, new settings/env vars/feature flags.
   - **Where** — which pages, locations or collections are affected.
3. **Footers when they apply:** `BREAKING CHANGE: <what breaks and what to do>`
   (this alone bumps the major version), `Refs: #123` or a link to the request,
   `Co-authored-by: …`.
4. **One logical change per commit.** Do not bundle an unrelated fix into a
   feature commit; it would end up under the wrong heading.

Example:

```
feat(calendar): show one toolbar card on small screens

On phones the calendar toolbar wrapped into three rows and pushed the first
events below the fold. The filter, view switch and date navigation now share
a single card below 640px, with the back/forward controls moved to 3dicons so
they stay legible at that size.

Visible on every location's /<slug>/calendar page and the site-wide calendar.
No data changes.

Refs: #142
```

Local development uses `meteor run --settings private/settings.json`;
`private/settings.json` is gitignored, template in `changethis.settings.json`.
