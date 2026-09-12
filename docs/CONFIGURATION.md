# Configuration

Cocoso is configured through a Meteor settings file and a small number of
environment variables. The settings file is passed with
`meteor run --settings private/settings.json` in development and with the
`METEOR_SETTINGS` environment variable in production.

A template with every key lives in [`changethis.settings.json`](../changethis.settings.json).
Copy it to `private/settings.json` (gitignored) and edit it.

## Settings keys

### `public.*` — shipped to the browser

| Key                   | Required | Used by                                  | Meaning                                                                                                                                                                                                    |
| --------------------- | -------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public.name`         | yes      | client shell, group emails               | Fallback platform name shown before a Platform record exists.                                                                                                                                              |
| `public.iconsBaseUrl` | no       | `HelmetHybrid.tsx`                       | Base URL for favicons and touch icons (`<base>/favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-*.png`).                                                                                        |
| `public.authDomain`   | no       | auth pages, SSO methods, `oauth.js`, SSR | Hostname of the single-sign-on broker. When unset, the OAuth broker and magic-link flow are disabled and each tenant handles login locally. See [ARCHITECTURE.md](ARCHITECTURE.md#authentication-and-sso). |

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

| Variable             | Meaning                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ROOT_URL`           | Canonical URL of the platform host. Used for absolute links in email, the default media URL, and the HTTPS redirect. Standard Meteor. |
| `MONGO_URL`          | MongoDB connection string. Standard Meteor.                                                                                           |
| `PORT`               | HTTP port. Standard Meteor.                                                                                                           |
| `METEOR_SETTINGS`    | The settings JSON as a string, for production.                                                                                        |
| `MEDIA_STORAGE_PATH` | Fallback for `media.storagePath`.                                                                                                     |
| `MAIL_URL`           | Written by the app from `mailCredentials.smtp`; do not set it yourself.                                                               |

## Multi-tenancy and hostnames

One running instance serves many tenants. The tenant is chosen per request
from the `Host` header and looked up in the `hosts` collection. There is no
per-tenant configuration in the settings file; everything tenant-specific
(name, logo, theme, menu, language, email footer) lives in the Host document
and is edited in the admin UI.

The reverse proxy in front of the app must forward the original `Host` header
and set `X-Forwarded-Proto`, otherwise tenant resolution and the HTTPS
redirect break. See [DEPLOYMENT.md](DEPLOYMENT.md).

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
