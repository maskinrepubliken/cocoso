# Deployment

Cocoso deploys as a standard Meteor bundle: one Node process, one MongoDB
database, a reverse proxy in front, and a persistent directory for uploads.

## Build

```bash
meteor npm install
meteor build ../build --architecture os.linux.x86_64 --server-only
```

This produces `../build/cocoso.tar.gz`. On the server:

```bash
tar -xzf cocoso.tar.gz
cd bundle/programs/server && npm install --omit=dev && cd ../..
```

## Run

```bash
export ROOT_URL=https://tranemo.example.org
export MONGO_URL=mongodb://localhost:27017/cocoso
export PORT=3000
export MEDIA_STORAGE_PATH=/var/lib/cocoso/media
export METEOR_SETTINGS="$(cat /etc/cocoso/settings.json)"
node main.js
```

Use a process manager (systemd, pm2) to keep it running. `ROOT_URL` must be
the public URL of the site; every absolute link the app produces is built
from it.

## Reverse proxy

The site's domain points at the process. The proxy must:

- terminate TLS and redirect `http://` to `https://` itself (the app no
  longer does);
- set `X-Forwarded-Proto: https`;
- proxy WebSocket upgrades (DDP);
- allow request bodies large enough for uploads (images are sent as base64
  in method calls; 20 MB is comfortable).

nginx example:

```nginx
server {
  listen 443 ssl http2;
  server_name tranemo.example.org;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    client_max_body_size 20m;
  }
}
```

Uploaded files under `/media/` can be served by the app (default) or
directly by the proxy from `MEDIA_STORAGE_PATH` for lower latency. If the
proxy serves them, keep the app's headers: long cache lifetime,
`X-Content-Type-Options: nosniff`, and `Content-Disposition: attachment` for
anything that is not an image or PDF.

## Persistent state

| What     | Where                                                     | Backup                                                        |
| -------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| Database | MongoDB                                                   | `mongodump` on a schedule                                     |
| Uploads  | `MEDIA_STORAGE_PATH` (`images/`, `documents/`, `legacy/`) | filesystem snapshot or rsync, together with the database dump |
| Settings | `settings.json` outside the bundle                        | in your secrets store                                         |

Both the database and the media directory must survive redeploys. Never put
the media directory inside the bundle folder.

## Adding a place

Log in as admin and open Admin → Places. Create the place with a name and
an address slug, add a picture and a description, and publish it when it
should appear on the home page and get its own pages under `/<slug>`.
Assign resources to the place in their forms; activities held at those
resources follow automatically.

## Migrating uploads from S3

Deployments older than September 2026 stored files in S3. After deploying
the local-storage version and setting `media.storagePath`, log in as an
admin and run in the browser console:

```js
Meteor.call('media.migrateFromS3', { dryRun: true }, console.log);
Meteor.call('media.migrateFromS3', {}, console.log);
```

The S3 buckets must remain publicly readable until the migration reports no
failures. Afterwards the AWS credentials can be revoked.

## Health checks

- `GET /` returns 200 with server-rendered HTML.
- `GET /media/<known-file>` returns 200 with `Cache-Control: immutable`.
- Server log lines at startup: `[media] Storing uploads in …` and
  `Meteor server restarted`.
