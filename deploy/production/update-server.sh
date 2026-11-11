#!/usr/bin/env bash
# Installs the server's own scripts from the released `production` branch:
# cocoso-deploy, cocoso-backup with its systemd units, and the deploy user's
# sudo rule. These live outside the Docker image, so a deploy does not update
# them. Run from a checkout of this repository, on a machine that can SSH to
# the server as the admin user:
#
#   deploy/production/update-server.sh <admin>@<server>
#
# Shows which files change, then installs them. The server's compose file,
# settings, Caddyfile and SSH config are left alone (they hold server-specific
# values; see README.md).
set -euo pipefail

HOST="${1:-${COCOSO_SERVER:-}}"
[[ -n "$HOST" ]] || { echo "användning: $0 <admin>@<server>   (eller sätt COCOSO_SERVER)" >&2; exit 1; }

cd "$(git rev-parse --show-toplevel)"
git fetch -q origin production
REF=origin/production
echo "installerar från $REF: $(git log -1 --format='%h %s' $REF)"

FILES=(
  usr/local/sbin/cocoso-deploy
  usr/local/sbin/cocoso-backup
  etc/systemd/system/cocoso-backup.service
  etc/systemd/system/cocoso-backup.timer
  etc/sudoers.d/91-deploy
)
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
for f in "${FILES[@]}"; do
  mkdir -p "$tmp/$(dirname "$f")"
  git show "$REF:deploy/production/files/$f" > "$tmp/$f"
done

tar -C "$tmp" -cz . | ssh "$HOST" 'set -euo pipefail
t="$(mktemp -d)"; trap "rm -rf \"$t\"" EXIT
tar -xz -C "$t"
changed=0
for f in $(cd "$t" && find . -type f | sed "s#^\./##"); do
  if sudo cmp -s "$t/$f" "/$f"; then echo "oförändrad  /$f"; else echo "uppdateras  /$f"; changed=1; fi
done
sudo visudo -cf "$t/etc/sudoers.d/91-deploy" >/dev/null
sudo install -m 755 -o root -g root "$t/usr/local/sbin/cocoso-deploy" "$t/usr/local/sbin/cocoso-backup" /usr/local/sbin/
sudo install -m 644 -o root -g root "$t/etc/systemd/system/cocoso-backup.service" "$t/etc/systemd/system/cocoso-backup.timer" /etc/systemd/system/
sudo install -m 440 -o root -g root "$t/etc/sudoers.d/91-deploy" /etc/sudoers.d/91-deploy
sudo systemctl daemon-reload
sudo systemctl enable --now cocoso-backup.timer >/dev/null 2>&1
[ "$changed" = 1 ] && echo "klart: installerat" || echo "klart: allt var redan aktuellt"'
