# Code audit — September 2026

A full review of the codebase was done on 2026-09-12 covering the API layer,
the UI layer, tooling and documentation. This page records what was found,
what was fixed in the `chore/cleanup-and-docs` branch, and what remains as a
prioritised backlog. Line references are to that branch.

## Fixed

### Security

| Finding                                                                                                                                                                                           | Fix                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `saveUserInfo` spread arbitrary client input into `$set` on `users`; the schema includes `isSuperAdmin`, so any logged-in user could promote themself.                                            | Explicit allow-list of profile fields with `check()`.                                                                  |
| `getCurrentUser` returned the whole user document, including the bcrypt hash and login tokens.                                                                                                    | Method removed (it had no callers).                                                                                    |
| Admin methods fetched documents by `_id` only, so an admin of one tenant could edit or delete another tenant's activities, pages, composable pages, resources, categories, documents and reports. | Every lookup and update now uses `{ _id, host }`; reports carry a `host` and are filtered by it.                       |
| `createPage`, `updatePage`, `createComposablePage`, `updateComposablePage` accepted a client-supplied `hostPredefined` that was also used for the permission check.                               | Parameter removed; host always comes from the connection.                                                              |
| Update methods spread the client payload into `$set`, allowing `host`, `authorId` and `_id` to be rewritten.                                                                                      | Those keys are stripped before writing.                                                                                |
| `createGroupNotification` was a public method that wrote notifications to and emailed every member of any group on any host.                                                                      | Internal function, called only from `addChatMessage`.                                                                  |
| `addChatMessage` posted into any chat by id regardless of host.                                                                                                                                   | Verifies the chat belongs to the current host.                                                                         |
| Attendance methods took unchecked arguments and did not verify the activity's host.                                                                                                               | `check()` on all arguments, host-scoped lookup, email validation. Public RSVP remains possible by design; see backlog. |
| Email templates interpolated names and titles unescaped.                                                                                                                                          | Shared `escapeHtml` helper applied in activity and group mails.                                                        |
| No rate limiting at all.                                                                                                                                                                          | `DDPRateLimiter` rules for email, account, login and upload methods.                                                   |
| The `documents` publication published every document in the database with no auth.                                                                                                                | Deleted with the other unused publications.                                                                            |

### Correctness bugs

- `setHostHue` never awaited its host lookup and updated an undefined id.
- `validateLabel` read `.length` off a Promise and its callers negated a
  Promise, so duplicate resource names were never rejected.
- `setAvatar` used the positional operator against the wrong array when
  updating direct-message avatars.
- `deletePage` mapped over an unresolved cursor when renumbering pages.
- `createAccount` threw an object as the error code followed by dead code.
- A verification error referenced an undefined `error` variable.
- `WebAppInternals` was used in server startup without being imported.
- The CDN origin was read as `cdn_server` in one file and `cdnserver` in
  another; both now read `settings.cdnServer`.
- 19 React components called hooks conditionally.
- The server loaded translations from itself over HTTP, which failed during
  startup and left server-rendered pages in English for Swedish and Turkish
  visitors, producing hydration errors on every load. The server now reads
  the YAML files from disk.
- Swedish and Turkish translation files had 17 keys missing or nested
  differently from English; `npm run check:i18n` now guards parity.

### Tooling

- `tsc` had never actually run: TypeScript 4.9 aborted on a parse error in a
  dependency and the config scanned `node_modules`. The project now uses
  TypeScript 5, `@types/meteor`, `@types/node`, explicit `include`, and a
  baseline ratchet so CI fails on new type errors while the 1284 pre-existing
  ones are worked down.
- `npm run lint` could not run at all (no ESLint installed, ESLint 8 flags).
  ESLint 9 flat config added; 330 errors fixed; 0 errors, 476 warnings.
- Deleted `jsconfig.json` (paths hard-coded to another developer's machine)
  and the tracked 900 KB `tsconfig.tsbuildinfo`; fixed `.prettierrc`, which
  contained an ESLint rule; broadened `.gitignore`.
- Added `scripts/check-i18n.mjs`, `knip.json`, GitHub Actions CI, and format
  scripts. Removed the dead `e2e` script.
- Removed 24 unreferenced files and 21 publications nothing subscribed to.
- Settings template is now valid JSON and documents `public.authDomain`,
  `media.*` and `cdnServer`. Unused AWS credentials were removed from the
  local settings file (revoke them in IAM as well).

### Documentation

README rewritten to describe the current system; new `docs/ARCHITECTURE.md`,
`docs/CONFIGURATION.md`, `docs/DEVELOPMENT.md`, `docs/DEPLOYMENT.md`,
`CLAUDE.md`. The stale `TYPESCRIPT_MIGRATION_PLAN.md` (it claimed 11% TS;
reality is 70%) was folded into `docs/DEVELOPMENT.md`.

## Backlog

Ordered by value. Effort: S under a day, M a few days, L a week or more.

### Security and robustness

1. **Public RSVP mutation without proof of identity** (M). `updateAttendance`
   and `removeAttendance` let anyone who knows an attendee's email change or
   cancel that registration. Issue a signed token in the confirmation email
   and require it, or require login.
2. **`check()` coverage** (L). About 20 mutation methods still accept
   free-form objects (`createActivity`, `updateGroup`, `createWork`,
   `updateHostSettings`, `updatePlatformSettings`, `saveKeywords`, …).
   Collection2 rejects wrong types but only after side effects. Add
   `Match.ObjectIncluding` shapes per method.
3. **Upload limits** (S). `images.upload` and `createDocument` accept
   unbounded base64 and any MIME type. Cap size server-side and allow-list
   document types.
4. **`resetUserPassword` mutates global `Accounts` templates per call** (S).
   Two concurrent resets from different tenants can send a link for the wrong
   host. Build the URL per request instead.
5. **Cross-host read methods** (M). `getDocumentsByAttachments`,
   `getUserContactInfo`, `checkDatesForConflict` and the `hostPredefined`
   parameter on read methods leak data between tenants. Decide which reads
   are intentionally federated and scope the rest.
6. **`deleteAccount` uses a 60-second in-memory timer** (S). A restart in
   that window leaves an orphaned user with memberships already removed.
7. **Feedback form posts to a hard-coded Formspree endpoint** and the
   federation menu loads an icon from a third-party S3 bucket
   (`FeedbackForm.tsx`, `FederationIconMenu.tsx`) (S). Make both
   configurable or local.

### Correctness

8. **Group `adminId` references** (S). Migration 14 renamed `adminId` to
   `authorId`, but `filterPrivateGroups`, `getGroup`, `getGroups` and the
   group publication still compare against `adminId`, which is always
   undefined.
9. **Chat schema drops `senderAvatar`** (S). `chat.js` does not declare it, so
   Collection2 strips it from every message.
10. **Loader errors** (M). 20 of 24 route loaders have no `try/catch` and no
    route defines `errorElement`; the fallback error UI uses Tailwind classes
    that do not exist in this project and hard-coded English.
11. **Silently swallowed errors** (S). Nine `catch { console.log(error) }`
    blocks in the UI give the user no feedback when saving a calendar entry,
    publishing a page, leaving a group or sending a chat message fails.
12. **Migrations file** (M). Versions 1–17 are obsolete and several contain
    missing `await`s that would corrupt data if run. Keep only 18, finish it
    (the `$unset` calls are commented out), then delete the conflict-report
    scaffolding.

### Code health

13. **Type errors** (L, incremental). 1284 in the baseline. Largest classes:
    implicit `any` parameters (≈400), `useState(null)`/`atom(null)` inferred
    as `never` (≈90), loosely typed `Host`/`User` shapes. Start with
    `imports/ui/types.ts` and the page-level atoms.
14. **Email templates** (L). `group.mails.js`, `activity.mails.js` and
    `templates.mails.ts` are 2600 lines of near-identical inline HTML with
    two divergent `mailtranslations.js` files. Extract one shell and one
    translations module, or move them to React Email like the newsletter.
15. **Duplicated UI families** (M each). Six `New*/Edit*` page pairs, six
    `*AdminFunctions`, six `*InteractionHandler` components differ only in
    method names and labels. A `useEntryMutation` hook and config-driven
    components would remove roughly 1300 lines.
16. **Shared utilities** (M). `imports/api/_utils/shared.ts` mixes server,
    client and browser-only code (it imports an image resizer into the
    server bundle). Split into `host`, `dates`, `bookings`, `text`; move
    `useMediaQuery` and `clientUpload` under `imports/ui`.
17. **Stitches config** (S). `stitches.config.ts` exports `createStitches({})`
    with the real config commented out, and duplicates the helper functions
    in `imports/ui/core/functions.ts`. Pick one.
18. **Method naming** (S). Three conventions coexist (`createDocument`,
    `images.upload`, `reports_create`). Pick one for new code; renaming old
    ones is optional.
19. **Terms page** (M). 720 lines of hard-coded English legal text in
    `Terms.tsx`; Swedish and Turkish users get English. Move to i18n or to a
    per-host page.
20. **Accessibility** (M). Listing grids are clickable `div`s without
    keyboard support; several `<img>` lack `alt`; global `button { border:
none }` with no focus style.
21. **Dependencies** (S). Confirmed unused: `@szhsin/react-accordion`,
    `query-string`, `rooks`, `uuid`, `postcss-easy-import`,
    `react-virtualized-auto-sizer`, `@types/react-router-dom`. Fifteen
    `@react-email/*` packages can collapse into `@react-email/components`.
    Two carousel, three drag-and-drop and five list/scroll libraries overlap.
    `bcrypt` looks unused but is picked up by `accounts-password`; keep it.
22. **Meteor packages** (S). `service-configuration`, `es5-shim`,
    `mobile-experience`, `reactive-var` and `aldeed:simple-schema` appear
    unused (the code imports the npm `simpl-schema`). Remove one at a time
    and verify the build.
23. **Legacy schema fields** (S). `imagesLegacy`, `imageUrlLegacy` and
    `avatarLegacy` have no readers; drop with a `$unset` migration.
    `logoLegacy` is still read by the newsletter preview.
24. **Conventional commits** (decision). Zero of the last 40 commits follow
    the format the release scripts depend on. Either adopt it (commitlint)
    or remove the release scripts and `CHANGELOG.md`.
25. **Tests** (L). There are none. The method layer is the natural place to
    start: `meteortesting:mocha` with a seeded host and three role users
    would cover the authorization rules fixed in this audit.
