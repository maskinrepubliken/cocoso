# Production

How the production site runs, how a release gets there, and how to rebuild the
server from scratch. Everything specific to the one server (domain, addresses,
user names, keys, passwords) is a placeholder here; the real values live in
`setup.env` and `keys/` (gitignored), on the server, in GitHub's `production`
environment and in the password manager.

## The parts

```
GitHub ── main ──► docker.yml builds ghcr.io/maskinrepubliken/cocoso:sha-<commit>
   │
   └─ production ─► deploy.yml tags it :production, joins the tailnet (tag:ci),
                    ssh deploy@<server> ─► /usr/local/sbin/cocoso-deploy

Server (Debian 13, one VPS)
  Caddy (host)          :80/:443, Let's Encrypt, proxies to 127.0.0.1:3000
  docker compose        /opt/cocoso: app (:production) + mongo:7 (replica set rs0)
  cocoso-backup.timer   03:00 → /var/backups/cocoso/{daily,weekly}
  sshd                  keys only; users <admin>, backup-pull, deploy
  ufw + fail2ban        22 (rate-limited), 80, 443, Tailscale; nothing else
  Tailscale             tag:server; the deploy and the backup pull come this way
```

| On the server | From here | What |
|---|---|---|
| `/opt/cocoso/docker-compose.yml` | `files/opt/cocoso/` | The app and MongoDB. The app listens on 127.0.0.1 only. |
| `/opt/cocoso/settings.json` | `settings.example.json` | Meteor settings, mode 644 (the app reads it as uid 1000). No secrets. |
| `/opt/cocoso/.env` | `env.example` | `ROOT_URL` and `SMTP_PASSWORD`, mode 600. |
| `/opt/cocoso/deploy.sh` | | Runs `cocoso-deploy` by hand. |
| `/usr/local/sbin/cocoso-deploy` | `files/usr/local/sbin/` | Pulls `:production`, recreates the app, waits for it to answer, rolls back if it doesn't. |
| `/usr/local/sbin/cocoso-backup` | `files/usr/local/sbin/` | mongodump + media + config, checksummed, rotated (14 daily, 8 weekly). |
| `/etc/caddy/Caddyfile` | `files/etc/caddy/` | TLS, `www` redirect, 40 MB request bodies, security headers. |
| `/etc/ssh/sshd_config.d/00-0-hardening.conf` | `files/etc/ssh/…` | Sorts before the provider's file, which turns root and password login on. |
| `/etc/fail2ban/jail.d/hardening.conf` | `files/etc/fail2ban/…` | Growing bans; the tailnet is never banned. |
| `/etc/sudoers.d/91-deploy` | `files/etc/sudoers.d/` | `deploy` may run `cocoso-deploy` with no arguments, nothing else. |

## Releasing and deploying

Two separate steps, both described in the repository's `CLAUDE.md`:

1. **Release.** `npm run release` on `dev`, then `main` is fast-forwarded to it.
   CI runs and `docker.yml` builds the image `:sha-<commit>` (also `:latest`,
   `:main`). The site does not change.
2. **Deploy.** Move the `production` branch to that release:

   ```bash
   git push origin origin/main:production
   ```

   `deploy.yml` checks that the commit is on `main`, waits for its image, tags
   it `:production`, joins the tailnet and runs `cocoso-deploy` on the server,
   then checks that the public site answers. Follow it under Actions →
   "Deploy to production". If the app does not answer within two minutes the
   previous image is put back and the run fails.

The rulesets (`deploy/github/rulesets/`) keep `production` forward-only and
let it move only to commits whose CI passed.

**Roll back:** Actions → "Deploy to production" → Run workflow, on the branch
`production`, with the full commit sha of an older release. The branch stays
where it is; the next push to it deploys forward again.

## Updating the server's own scripts

`cocoso-deploy`, `cocoso-backup` (with its systemd units) and the deploy user's
sudo rule live outside the Docker image, so a deploy does not update them.
After a release that changes them, from a checkout of this repository:

    deploy/production/update-server.sh <admin>@<server>

It installs them as they are on the `production` branch and lists what changed.

## Changing production data

One-off data scripts (`scripts/migrations/*.mongosh.js`) are run against the
production database with

    deploy/production/run-mongosh.sh <admin>@<server> <script.js>            # dry run
    deploy/production/run-mongosh.sh <admin>@<server> <script.js> --apply    # changes data

Take a fresh backup first (`sudo cocoso-backup` on the server).

## GitHub

- **Environment `production`** (Settings → Environments), deployment branches:
  `production` only.
  - Secrets: `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET` (Tailscale OAuth client,
    below) and `DEPLOY_SSH_KEY` (the private half of the deploy key).
  - Variables: `DEPLOY_HOST` (the server's tailnet address), `DEPLOY_KNOWN_HOSTS`
    (`<tailnet address> ssh-ed25519 <host key>`, from
    `/etc/ssh/ssh_host_ed25519_key.pub`) and `PRODUCTION_URL`.
- **Rulesets:** import the three files in `deploy/github/rulesets/` (Settings →
  Rules → Rulesets → New ruleset → Import).

The deploy key: `ssh-keygen -t ed25519 -N "" -C github-actions-deploy -f deploy`;
the private file goes into `DEPLOY_SSH_KEY`, the `.pub` into
`keys/deploy.pub` for `setup.sh` (or straight into
`/home/deploy/.ssh/authorized_keys` in the form of
`files/home/deploy/.ssh/authorized_keys.example`). Delete both files afterwards.

## Tailscale

In the admin console:

- **Access controls:** tag owners `tag:ci` and `tag:server`; members reach
  everything, CI reaches only SSH on the server:

  ```json
  "tagOwners": { "tag:ci": ["autogroup:admin"], "tag:server": ["autogroup:admin"] },
  "acls": [
    { "action": "accept", "src": ["autogroup:member"], "dst": ["*:*"] },
    { "action": "accept", "src": ["tag:ci"], "dst": ["tag:server:22"] }
  ]
  ```

  Never leave a rule with source `*`: it would let CI machines reach the whole tailnet.
- **Machines:** tag the server `tag:server` (a tagged machine's key does not expire).
- **Settings → Trust credentials → OAuth:** *Auth Keys: write*, tag `tag:ci`.

## Backups

| Layer | Where | When |
|---|---|---|
| Application backup | `/var/backups/cocoso` on the server | daily 03:00 |
| Off-site copy | another machine pulls it as `backup-pull` over the tailnet (read-only `rrsync`), checks the checksums and keeps it with restic | nightly |
| Whole disk | the hosting provider's VPS backups | weekly |

A machine that pulls gets one line in `/home/backup-pull/.ssh/authorized_keys`
(see `files/home/backup-pull/.ssh/authorized_keys.example`) and uses the
server's tailnet address, not a short name.

**Restoring the database** from a dump:

```bash
docker compose -f /opt/cocoso/docker-compose.yml exec -T mongo \
  mongorestore --archive --gzip --drop < mongo-<stamp>.archive.gz
```

Test a dump without touching the live data by restoring it under another name
(`--nsFrom 'cocoso.*' --nsTo 'restoretest.*'`), counting documents, and dropping it.

**Media:** `docker run --rm -v cocoso_media-data:/media -v "$PWD":/in alpine tar -xzf /in/media-<stamp>.tar.gz -C /media`.

## A new server

1. Debian 13 with root SSH access; DNS `A` records for the domain and `www`
   pointing at it.
2. Here: `cp setup.env.example setup.env`, fill it in, put the public keys in `keys/`.
3. `scp -r deploy/production root@<server>:/root/cocoso-setup` and run
   `/root/cocoso-setup/setup.sh` there. It is idempotent.
4. **Before closing the root session**, check that `ssh <admin>@<server>` works:
   the script turns root and password login off.
5. `tailscale up --hostname=<name>`, tag the machine `tag:server`, and set
   `DEPLOY_HOST` and `DEPLOY_KNOWN_HOSTS` in GitHub.
6. Fill in `/opt/cocoso/settings.json` (with the `site` block: the site and
   its first admin are created on first start, see `docs/CONFIGURATION.md`)
   and `/opt/cocoso/.env`.
7. Deploy: run "Deploy to production" on `production` (or push to it). On a
   brand new database read the admin's one-time password from
   `docker compose logs app | grep bootstrap`.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Deploy run fails at "Join the tailnet" | OAuth client missing, revoked or without `tag:ci`; check the secrets and the Trust credentials page. |
| Deploy run fails at "Deploy on the server" with `Permission denied` | The deploy key on the server and in `DEPLOY_SSH_KEY` don't match, or the ACL doesn't let `tag:ci` reach `tag:server:22`. |
| `Host key verification failed` | `DEPLOY_KNOWN_HOSTS` is outdated (server reinstalled?). Check why before replacing it. |
| "appen svarade inte inom 120 s" | The new image doesn't start; the previous one is back. See the log lines in the run, fix, release again. |
| Saving an image fails; the log says `EACCES: permission denied, mkdir '/var/lib/cocoso/media/images'` | The media volume is not owned by the app's user (uid 1000). Every deploy fixes it; by hand: `docker run --rm -v cocoso_media-data:/m alpine chown -R 1000:1000 /m`. |
| SSH from the office times out for a while | ufw rate-limits port 22 per address (6 connections in 30 s) and fail2ban bans repeated failed logins. Use the tailnet address, which is never limited. |
