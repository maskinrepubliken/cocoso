# Cocoso — notes for AI assistants

Read `docs/ARCHITECTURE.md` and `docs/DEVELOPMENT.md` before making changes.
The short version:

- Meteor 3 + React 18 + MongoDB, one process serving one site (Tranemo
  kommun). The site's settings are the single document in `site`
  (`getSite()`); the UI still calls it `Host`/`currentHost`. There is no
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
- Translations: `public/i18n/<lang>/<ns>.yml`; add English first, then sv and tr.
- Escape user input with `imports/api/_utils/escapeHtml.js` inside email HTML.

Before finishing any change run:

```bash
npm run lint && npm run typecheck && npm run check:i18n
```

`typecheck` compares against `typecheck-baseline.json`; only new errors fail.
If you fix existing errors, run `npm run typecheck:update` and commit the file.

Local development uses `meteor run --settings private/settings.json`;
`private/settings.json` is gitignored, template in `changethis.settings.json`.
