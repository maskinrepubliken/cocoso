# Architecture

Cocoso is a single Meteor 3 application serving one site, here Tranemo
kommun, from one process and one MongoDB database. The municipality is
split into locations (villages and places) that each get their own pages
under the same brand and the same accounts. The client is React 18 with
React Router 7, server-side rendered on first load and hydrated in the
browser.

```
browser ──HTTP/DDP──▶ Meteor (Node 22)
                       ├─ SSR: React Router static handler → HTML
                       ├─ Meteor methods (all reads and writes)
                       ├─ 6 publications (current user, chats, DMs)
                       ├─ /media/*  local file serving
                       └─ MongoDB (one database)
```

## Source layout

| Path                                                               | Purpose                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `client/main.js`, `client/main.html`, `client/main.css`            | Client entry, HTML shell, global stylesheet.                                                                                                     |
| `server/main.js`                                                   | Server entry; imports `imports/startup/server`.                                                                                                  |
| `imports/startup/client/index.jsx`                                 | Boot sequence: waits for i18n, loads the site and the locations, builds the router, hydrates.                                                    |
| `imports/startup/server/`                                          | `index.js` (SMTP, SSR hook), `api.js` (imports every API module), `serverRenderer.js`, `media.ts`, `rateLimits.js`.                              |
| `imports/startup/i18n.js`                                          | Shared i18next setup for client and server.                                                                                                      |
| `imports/appRoutes.js`, `imports/loaders.js`, `imports/actions.js` | Route table, route loaders, router actions.                                                                                                      |
| `imports/state.ts`                                                 | Global jotai atoms (site, locations, user, role, viewport).                                                                                      |
| `imports/api/<module>/`                                            | One folder per domain model: collection + schema, methods, occasionally mail templates and helpers.                                              |
| `imports/api/_utils/`                                              | Shared utilities: schemas, `publicUrl()`, `locationSelector()`, mail sending, image processing, media storage, i18n helpers.                     |
| `imports/ui/core/`                                                 | Design-system primitives built on Stitches (Box, Button, Modal, Tabs, …). Import from the barrel `/imports/ui/core`.                             |
| `imports/ui/layout/`                                               | App shell: header, menus, footer, wrapper, helmet.                                                                                               |
| `imports/ui/listing/` and `imports/ui/entry/`                      | Index pages and detail pages for each content type. Components suffixed `Hybrid` render identically on server and client.                        |
| `imports/ui/forms/`                                                | Schema-driven form engine and uploaders.                                                                                                         |
| `imports/ui/pages/`                                                | Route components grouped by feature, including `admin/` and `locations/`.                                                                        |
| `public/i18n/<lang>/<ns>.yml`                                      | Translations (en, sv, tr), nine namespaces.                                                                                                      |

## The site and its locations

There is exactly one document in the `site` collection
(`imports/api/site`). It holds the site's name, contact details, logo, menu,
theme and email templates and is edited in the admin area. `getSite()`
reads it on the server; the UI still calls it `Host` / `currentHostAtom`
for historical reasons. There is no per-request tenant resolution and no
`host` field on documents any more; `ROOT_URL` is the one public address,
and `publicUrl(path)` builds absolute links from it for emails and
canonical tags.

The municipality is divided into **locations** (`imports/api/locations`):
villages and places with a slug, name, description, image, publish flag
and order, managed by admins under `/admin/locations`. Slugs are checked
against the site's own top-level routes (`reservedSlugs.js`). Published
locations are loaded once at boot into `locationsAtom`.

Resources, activities, groups and works carry an optional `locationId`.
A resource's location is chosen in its form. An activity held at a resource
takes the resource's location on the server (`resolveActivityLocation`)
and follows it if the resource moves; an activity without a resource picks
its own. Groups and works choose freely. No location means the whole
municipality. Listing methods take an optional location id and return the
place's own items plus municipality-wide ones (`locationSelector()`); the
loaders sort the place's own items first.

### URLs

The first URL segment is a dispatcher (`/:slug` in `imports/appRoutes.js`,
rendered by `SlugHandler`): `/@name` is a profile, anything else is looked
up among the published locations, and unknown slugs render the 404 page.
Under a location the public listing and entry routes are mounted a second
time, so `/limmared/activities` and `/limmared/activities/<id>` exist next
to `/activities` and `/activities/<id>`. Entry pages keep their canonical
link on the root URL. Nothing about the chosen place is stored in a cookie;
the URL carries it, and `useCurrentLocation()` / `useLocationPrefix()`
(`imports/ui/utils/useLocation.ts`) derive it from the pathname so menu,
footer, back links and popups stay inside the place.

`/<slug>` is the location's landing page (`LocationLanding`): hero image,
description, an optional composable page attached by the admin, and
automatic sections for upcoming activities, venues and groups. The home
page shows a grid of the places above the first listing.

User accounts are global. A person has one account and at most one
`memberships` document with a role of `participant`, `contributor` or
`admin`; role checks live in `imports/api/users/user.roles.js` and take a
user id only. Location-scoped roles are not implemented yet.

## Request flow

1. **SSR.** `server-render`'s `onPageLoad` calls `serverRenderer.js`. It loads
   the site, the page titles and the published locations, resolves the
   visitor's language, runs React Router's static handler against the route
   table and renders to a string. Theme CSS variables and Stitches CSS are
   inlined in `<head>`.
2. **Hydration.** `imports/startup/client/index.jsx` waits for i18next, calls
   the same bootstrap methods over DDP, builds a browser router with the
   same route table and hydrates `#root`. If no site exists yet the setup
   wizard renders instead (admin account, then site).
3. **Navigation.** Routes declare loaders (`imports/loaders.js`) that call
   Meteor methods through the `call()` wrapper. Components read loader data
   with `useLoaderData()` and global state with jotai atoms. Mutations call
   methods directly and then revalidate.
4. **Realtime.** Only the current user document, memberships, chats and
   direct messages use publications; everything else is request/response.

Route components that are not needed for public SSR (admin, auth, profile,
messages) are code-split with `@loadable/component`. After a deploy the
client detects the new bundle and reloads at the next idle navigation.

## Authentication

Accounts use `accounts-password`; login, signup and password reset happen
on the site itself. Direct messages are end-to-end encrypted in the browser;
the server stores public keys and encrypted private keys but never
plaintext.

## Media storage

Uploads are sent to the server as base64 over a method call. Images are
processed with Sharp into four WebP variants (thumb, small, medium, full)
plus a PNG rendition for logos, then written under `media.storagePath` in
`images/<user>/<id>/`. Documents go to `documents/<user>/<id>/<filename>`.
`imports/startup/server/media.ts` serves them under `/media/*` with
immutable caching; anything that a browser could execute as a page is
served as a download with `nosniff`. Records are kept in the `images` and
`documents` collections, and content documents store the variant URLs.

A one-off admin method, `media.migrateFromS3`, moves files from the
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

One-off scripts live in `scripts/migrations/` and are run by hand with
`mongosh`. `2026-09-single-site.mongosh.js` moved an existing multi-tenant
database to this model: it renamed `hosts` to `site`, removed the `host`
fields, dropped the platform and SSO collections and rebuilt the
memberships indexes.

## Security model in brief

- All client access to data goes through methods; there are no `allow`/`deny`
  rules and no `insecure` or `autopublish` packages.
- Methods check `Meteor.userAsync()`, then role via `user.roles.js`, then
  query by `_id`.
- Argument shapes are validated with `check()` where the payload is a
  primitive or a small object; free-form form values are filtered of
  `_id` and author fields before `$set`; an activity's `locationId` is
  always derived on the server when it has a resource.
- DDP rate limits (`imports/startup/server/rateLimits.js`) cap email-sending,
  account, login and upload methods per connection.
- Uploaded files are never served with an executable content type.
