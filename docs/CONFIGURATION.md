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
| `public.packages.dynamic-import.useLocationOrigin` | yes      | Meteor `dynamic-import`                  | Keep `true`. Makes the browser fetch code-split modules (every `loadable()` route) from the origin the page was opened on. Without it Meteor fetches them from `ROOT_URL`, so opening the site on any other hostname (for example `localhost` in development) fails to load those routes and shows the "Something went wrong while loading this page" error.        |

Everything under `public` is visible to any visitor. Never put secrets there.

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
| `password`  | yes      | SMTP password.                                                                                       |
| `host`      | yes      | SMTP host.                                                                                           |
| `port`      | yes      | SMTP port, as a string. The connection uses SMTPS.                                                   |

At startup the server composes `MAIL_URL` from these values. If the block is
missing, a warning is logged and no mail is sent.

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
is edited in the admin UI, not in the settings file. The municipality's
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
