# Configuration

Cocoso is configured through a Meteor settings file and a small number of
environment variables. The settings file is passed with
`meteor run --settings private/settings.json` in development and with the
`METEOR_SETTINGS` environment variable in production.

A template with every key lives in [`changethis.settings.json`](../changethis.settings.json).
Copy it to `private/settings.json` (gitignored) and edit it.

## Settings keys

### `public.*` — shipped to the browser

| Key                                                | Required | Used by                                  | Meaning                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------- | -------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `public.name`                                      | yes      | client shell, group emails               | Fallback site name used before the site document exists and as the sender name when the site has none.                                                                                                                                                                                                                  |
| `public.iconsBaseUrl`                              | no       | `HelmetHybrid.tsx`                       | Base URL for favicons and touch icons (`<base>/favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-*.png`).                                                                                                                                                                                                      |
| `public.facebookAppId`                             | no       | `HelmetHybrid.tsx`                       | Facebook app id written as `fb:app_id` on every page. Optional: link previews work without it; Facebook's Sharing Debugger only warns, and with it the app's insights cover shared links.                                                                                                                                |
| `public.packages.dynamic-import.useLocationOrigin` | yes      | Meteor `dynamic-import`                  | Keep `true`. Makes the browser fetch code-split modules (every `loadable()` route) from the origin the page was opened on. Without it Meteor fetches them from `ROOT_URL`, so opening the site on any other hostname (for example `localhost` in development) fails to load those routes and shows the "Something went wrong while loading this page" error.        |

Everything under `public` is visible to any visitor. Never put secrets there.

### `site.*` — creating the site on first start

| Key                   | Required | Meaning                                                                                                                                                                       |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `site.name`           | yes      | The place the site is for, e.g. `"Tranemo"`. The site is named `<name>kalendern` ("Tranemokalendern"), and `<name>` is the short name in the header and the start page. |
| `site.admin.username` | yes      | Username of the first admin.                                                                                                                                                  |
| `site.admin.email`    | yes      | Email of the first admin, and the site's contact address.                                                                                                                    |
| `site.data`           | no       | Data pack in `private/bootstrap/<data>/` to load: places, venues, request kinds and pages. `"tranemo"` is the Tranemo pack.                                                  |

```json
"site": {
  "name": "Tranemo",
  "admin": { "username": "admin", "email": "admin@example.org" },
  "data": "tranemo"
}
```

When the server starts (`imports/startup/server/bootstrap.ts`):

1. **No site yet:** it creates one, in Swedish, with the default menu and
   theme (`imports/startup/constants.js`).
2. **No admin yet:** it creates the admin with a generated password and
   prints it to the server log, once, as a `[bootstrap]` line. Log in with
   it at `/login?losenord`, or by email code at `/login` like everyone else.
3. **Data pack:** each part (places, venues, request kinds, pages) is loaded
   only into an empty collection, and only once. The site document records
   it under `bootstrap`, so something an admin deletes later does not come
   back on a restart. On an existing site the parts it never had are filled
   in and the rest is left alone.

Everything after that (name, logo, theme, menu, texts) is edited in the
admin area; changing `site` later does not change an existing site. There
is no setup page in the browser. To build a pack from a configured
database, run `scripts/export-bootstrap-pack.mongosh.js`.

### `media.*` — uploaded files

| Key                 | Required | Default                                   | Meaning                                                                                                                |
| ------------------- | -------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `media.storagePath` | no       | `$MEDIA_STORAGE_PATH`, then `<cwd>/media` | Directory on the server where uploaded images and documents are written. Must be on a persistent volume in production. |
| `media.publicUrl`   | no       | `ROOT_URL` + `/media`                     | Public base URL for uploaded files. Set it when a CDN or a different hostname fronts the media route.                  |

Files are served by the app itself under `/media/…`. Details in
[ARCHITECTURE.md](ARCHITECTURE.md#media-storage).

### `mailCredentials.smtp.*` — outbound email

| Key         | Required | Meaning                                                                                              |
| ----------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `fromEmail` | yes      | From header, e.g. `"Cocoso <noreply@example.org>"`. Also used as the sender for password-reset mail. |
| `userName`  | yes      | SMTP login.                                                                                          |
| `password`  | no       | Last resort only — leave it out and set `SMTP_PASSWORD` instead (below).                             |
| `host`      | yes      | SMTP host.                                                                                           |
| `port`      | yes      | SMTP port, as a string. `465` uses SMTPS; any other port STARTTLS.                                   |

**The SMTP password is not kept in a settings file.** Set it as
`SMTP_PASSWORD`: in the environment, or as a line in `.env` next to
`docker-compose.yml` (gitignored; compose passes it to the app, and the
server also reads it from the checkout's `.env` directly when started without
it, as the dev container on the office Mac is).

At startup the server composes `MAIL_URL` from these values (a `MAIL_URL`
already in the environment wins). If the server was started with settings
that lack the block, it reads `METEOR_SETTINGS_FILE` or the checkout's
`docker/settings.json` instead. With no SMTP settings or no password, a
warning is logged and sending mail fails with `mail-not-configured` — it is
never silently printed to the log instead of sent.

### `cdnServer`

Optional origin (for example `https://cdn.example.org`) that serves the built
client bundle and the translation files. When set in production, Meteor
prefixes its JS and CSS URLs with it and i18next loads
`<cdnServer>/i18n/<lang>/<ns>.yml` from it. Leave it empty to serve everything
from the app.

## Environment variables

| Variable             | Meaning                                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ROOT_URL`           | The site's public URL. `publicUrl()` builds every absolute link from it: emails, canonical tags, password reset links, the default media URL. Standard Meteor. Must be the URL browsers use; with the compose stack set it in a `.env` next to `docker-compose.yml`.   |
| `MONGO_URL`          | MongoDB connection string. Standard Meteor.                                                                                                                                                                                                        |
| `PORT`               | HTTP port. Standard Meteor.                                                                                                                                                                                                                        |
| `METEOR_SETTINGS`    | The settings JSON as a string, for production.                                                                                                                                                                                                     |
| `MEDIA_STORAGE_PATH` | Fallback for `media.storagePath`.                                                                                                                                                                                                                  |
| `MAIL_URL`           | Written by the app from `mailCredentials.smtp`; do not set it yourself.                                                                                                                                                                            |

## One site, many places

One running instance serves one site. Everything site-specific (name, logo,
theme, menu, language, email footer) lives in the single `site` document and
is edited in the admin UI. The settings file only says how to create it the
first time (`site.*` above). The municipality's
locations are data too, managed under Admin → Places; each published
location gets its pages under `/<slug>`.

The reverse proxy in front of the app must set `X-Forwarded-Proto` and proxy
WebSocket upgrades. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Development settings

A minimal development file:

```json
{
  "public": { "name": "Cocoso" },
  "media": { "storagePath": "/absolute/path/to/checkout/media" },
  "mailCredentials": {
    "smtp": {
      "fromEmail": "Cocoso <dev@example.org>",
      "userName": "x",
      "password": "x",
      "host": "localhost",
      "port": "1025"
    }
  }
}
```

Uploads land in `./media`, which is gitignored and excluded from Meteor's
file watcher through `.meteorignore`.
