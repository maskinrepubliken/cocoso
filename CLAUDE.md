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

## Git: two branches — work on `dev`, release to `main`

Day-to-day work happens on the shared **`dev`** branch; **`main`** is only
ever moved by a release. Nothing on GitHub runs when `dev` is pushed; merging
to `main` is what triggers CI and the image build, so it happens once per
release instead of on every commit.

- Commit straight to `dev` and push it (`git push origin dev`). Do not create
  other branches, and do not switch the shared checkout — the live dev site
  serves whatever is checked out, and that should always be `dev`. If this
  conflicts with a general instruction to branch first, this one wins here.
- Pull (`git pull --ff-only origin dev`) before you start, and keep commits
  small so parallel sessions don't trip over each other.
- **Never push to `main` on your own.** It moves only when the person you are
  working with says the work is done and asks for it to be merged/released.

**Release (only when told "it's done" / "merge to main"):** the merge *is* the
release, and the changelog is generated at that moment from the Conventional
Commits on `dev` since the last tag — which is why every commit must follow
the format in the next section.

```bash
git pull --ff-only origin dev
npm run release                 # bumps the version from the commit types,
                                # regenerates CHANGELOG.md, commits, tags
git push --follow-tags origin dev
git push origin dev:main        # fast-forward main to the release — no checkout switch
```

If the last push is rejected, `main` has commits that are not on `dev`; stop
and tell the person rather than forcing or merging by hand.

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
