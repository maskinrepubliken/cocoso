# Architecture

Cocoso is a single Meteor 3 application that serves many community sites
("hosts") from one process and one MongoDB database. The client is React 18
with React Router 7, server-side rendered on first load and hydrated in the
browser.

```
browser ──HTTP/DDP──▶ Meteor (Node 22)
                       ├─ SSR: React Router static handler → HTML
                       ├─ Meteor methods (all reads and writes)
                       ├─ 6 publications (current user, chats, DMs)
                       ├─ /media/*  local file serving
                       ├─ /oauth/*  SSO broker (only on public.authDomain)
                       └─ MongoDB (one database, `host` field on every document)
```

## Source layout

| Path                                                               | Purpose                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `client/main.js`, `client/main.html`, `client/main.css`            | Client entry, HTML shell, global stylesheet.                                                                                                     |
| `server/main.js`                                                   | Server entry; imports `imports/startup/server`.                                                                                                  |
| `imports/startup/client/index.jsx`                                 | Boot sequence: waits for i18n, resolves the tenant, builds the router, hydrates.                                                                 |
| `imports/startup/server/`                                          | `index.js` (SMTP, SSR hook), `api.js` (imports every API module), `serverRenderer.js`, `oauth.js`, `media.ts`, `rateLimits.js`, `migrations.js`. |
| `imports/startup/i18n.js`                                          | Shared i18next setup for client and server.                                                                                                      |
| `imports/appRoutes.js`, `imports/loaders.js`, `imports/actions.js` | Route table, route loaders, router actions.                                                                                                      |
| `imports/state.ts`                                                 | Global jotai atoms (current host, user, platform, role, viewport).                                                                               |
| `imports/api/<module>/`                                            | One folder per domain model: collection + schema, methods, occasionally mail templates and helpers.                                              |
| `imports/api/_utils/`                                              | Shared server utilities: host resolution, schemas, mail sending, image processing, media storage, i18n helpers.                                  |
| `imports/ui/core/`                                                 | Design-system primitives built on Stitches (Box, Button, Modal, Tabs, …). Import from the barrel `/imports/ui/core`.                             |
| `imports/ui/layout/`                                               | App shell: header, menus, footer, wrapper, helmet.                                                                                               |
| `imports/ui/listing/` and `imports/ui/entry/`                      | Index pages and detail pages for each content type. Components suffixed `Hybrid` render identically on server and client.                        |
| `imports/ui/forms/`                                                | Schema-driven form engine and uploaders.                                                                                                         |
| `imports/ui/pages/`                                                | Route components grouped by feature, including `admin/` and `superadmin/`.                                                                       |
| `public/i18n/<lang>/<ns>.yml`                                      | Translations (en, sv, tr), nine namespaces.                                                                                                      |
| `packages/force-ssl-custom`                                        | Local Meteor package: per-host HTTPS redirect.                                                                                                   |

## Multi-tenancy

Every request carries a `Host` header. The server resolves it to a document
in the `hosts` collection; that document holds the tenant's name, logo,
theme, menu and settings. All content collections carry a `host` field and
every method scopes its queries by the host taken from the connection
(`getHost(this)` in `imports/api/_utils/shared.ts`). Client-supplied host
values are never trusted for writes.

One host per platform can be flagged `isPortalHost`. The portal aggregates
public content from all hosts (`getAll…FromAllHosts` methods) and shows the
federation menu.

User accounts are global: a person has one account and a `memberships`
document per host with a role of `participant`, `contributor` or `admin`.
Role checks live in `imports/api/users/user.roles.js`. A user can also be
`isSuperAdmin`, which grants platform-wide admin pages.

## Request flow

1. **SSR.** `server-render`'s `onPageLoad` calls `serverRenderer.js`. It loads
   the Host, all hosts, the Platform and page titles, resolves the visitor's
   language, runs React Router's static handler against the route table and
   renders to a string. Theme CSS variables and Stitches CSS are inlined in
   `<head>`.
2. **Hydration.** `imports/startup/client/index.jsx` waits for i18next, calls
   the same four bootstrap methods over DDP, builds a browser router with the
   same route table and hydrates `#root`. If no Host or Platform exists the
   setup wizard renders instead.
3. **Navigation.** Routes declare loaders (`imports/loaders.js`) that call
   Meteor methods through the `call()` wrapper. Components read loader data
   with `useLoaderData()` and global state with jotai atoms. Mutations call
   methods directly and then revalidate.
4. **Realtime.** Only the current user document, memberships, chats and
   direct messages use publications; everything else is request/response.

Route components that are not needed for public SSR (admin, auth, profile,
messages) are code-split with `@loadable/component`. After a deploy the
client detects the new bundle and reloads at the next idle navigation.

## Authentication and SSO

Accounts use `accounts-password`. When `public.authDomain` is set, that
hostname runs an OAuth 2 authorization-code broker with PKCE
(`imports/startup/server/oauth.js`): tenant sites redirect there to log in,
receive a one-time code, and exchange it for a login token
(`imports/api/_utils/services/sso/sso.methods.js`). Magic-link login is part
of the same flow. The broker domain has no Host document and renders only
the auth page. Without `authDomain`, each tenant logs users in locally.

Direct messages are end-to-end encrypted in the browser; the server stores
public keys and encrypted private keys but never plaintext.

## Media storage

Uploads are sent to the server as base64 over a method call. Images are
processed with Sharp into four WebP variants (thumb, small, medium, full)
plus a PNG rendition for logos, then written under `media.storagePath` in
`images/<user>/<id>/`. Documents go to `documents/<user>/<id>/<filename>`.
`imports/startup/server/media.ts` serves them under `/media/*` with
immutable caching; anything that a browser could execute as a page is
served as a download with `nosniff`. Records are kept in the `images` and
`documents` collections, and content documents store the variant URLs.

A one-off super-admin method, `media.migrateFromS3`, moves files from the
previous S3 buckets and rewrites stored URLs.

## Email

SMTP settings come from `mailCredentials.smtp`. Sending goes through the
`sendEmail` method family in `imports/api/_utils/services/mails/`. Templates
are still hand-written HTML strings in `activity.mails.js`,
`group.mails.js` and `templates.mails.ts`; the newsletter preview uses React
Email. User-supplied scalars must be passed through
`imports/api/_utils/escapeHtml.js` before interpolation.

## Internationalisation

i18next loads YAML from `public/i18n/<lang>/<ns>.yml` over HTTP with
`js-yaml`. The client detects the language from the query string, cookie,
localStorage and browser settings; the server mirrors that order from the
request (`imports/api/_utils/i18n/serverI18n.js`) and renders with a
per-request clone of the i18n instance. `npm run check:i18n` verifies that
all languages have the same keys.

## Data migrations

`percolate:migrations` is installed and `imports/startup/server/migrations.js`
registers historical migrations, but none are run automatically. Migration
18 (copying `Hosts.members[]` into the `memberships` collection) is the only
one still relevant.

## Security model in brief

- All client access to data goes through methods; there are no `allow`/`deny`
  rules and no `insecure` or `autopublish` packages.
- Methods check `Meteor.userAsync()`, then role via `user.roles.js`, then
  query with `{ _id, host }` so cross-tenant edits are impossible.
- Argument shapes are validated with `check()` where the payload is a
  primitive or a small object; free-form form values are filtered of
  `_id`, `host` and author fields before `$set`.
- DDP rate limits (`imports/startup/server/rateLimits.js`) cap email-sending,
  account, login and upload methods per connection.
- Uploaded files are never served with an executable content type.
