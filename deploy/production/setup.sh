#!/usr/bin/env bash
# Sets up a production server for Cocoso from a fresh Debian 13, as root:
#
#   scp -r deploy/production root@<server>:/root/cocoso-setup
#   ssh root@<server> /root/cocoso-setup/setup.sh
#
# Idempotent: run it again after changing anything here. Everything specific
# to one server is read from setup.env next to this script (copy
# setup.env.example; never commit it). Afterwards root and password logins are
# off; log in as $ADMIN_USER. See README.md for the whole picture.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
FILES="$HERE/files"
[[ $EUID -eq 0 ]] || { echo "run as root" >&2; exit 1; }
[[ -r "$HERE/setup.env" ]] || { echo "copy setup.env.example to setup.env and fill it in" >&2; exit 1; }
# shellcheck source=/dev/null
source "$HERE/setup.env"
: "${ADMIN_USER:?}" "${ADMIN_KEYS:?}" "${DOMAIN:?}"
[[ -s "$HERE/$ADMIN_KEYS" ]] || { echo "$ADMIN_KEYS is empty: without it you are locked out" >&2; exit 1; }

step() { echo; echo "== $*"; }

step "1/9 packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg sudo ufw fail2ban unattended-upgrades rsync \
  debian-keyring debian-archive-keyring apt-transport-https >/dev/null
install -d -m 755 /etc/apt/keyrings
. /etc/os-release
if [[ ! -f /etc/apt/sources.list.d/docker.list ]]; then
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  echo "deb [signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $VERSION_CODENAME stable" \
    > /etc/apt/sources.list.d/docker.list
fi
if [[ ! -f /etc/apt/sources.list.d/caddy-stable.list ]]; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /etc/apt/keyrings/caddy-stable.gpg
  echo "deb [signed-by=/etc/apt/keyrings/caddy-stable.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" \
    > /etc/apt/sources.list.d/caddy-stable.list
fi
if [[ ! -f /etc/apt/sources.list.d/tailscale.list ]]; then
  curl -fsSL "https://pkgs.tailscale.com/stable/debian/$VERSION_CODENAME.noarmor.gpg" -o /etc/apt/keyrings/tailscale.gpg
  echo "deb [signed-by=/etc/apt/keyrings/tailscale.gpg] https://pkgs.tailscale.com/stable/debian $VERSION_CODENAME main" \
    > /etc/apt/sources.list.d/tailscale.list
fi
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin caddy tailscale >/dev/null

step "2/9 users"
id "$ADMIN_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$ADMIN_USER"
usermod -aG sudo,docker "$ADMIN_USER"
passwd -l "$ADMIN_USER" >/dev/null
install -d -m 700 -o "$ADMIN_USER" -g "$ADMIN_USER" "/home/$ADMIN_USER/.ssh"
install -m 600 -o "$ADMIN_USER" -g "$ADMIN_USER" "$HERE/$ADMIN_KEYS" "/home/$ADMIN_USER/.ssh/authorized_keys"
echo "$ADMIN_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-$ADMIN_USER"
chmod 440 "/etc/sudoers.d/90-$ADMIN_USER"

# Read-only backup pulls. Debian's own `backup` user has the shell nologin,
# which stops even rrsync, so this is a separate user in the backup group.
id backup-pull >/dev/null 2>&1 || useradd -m -s /bin/sh -G backup -c "Read-only backup pulls (rrsync)" backup-pull
passwd -l backup-pull >/dev/null
install -d -m 700 -o backup-pull -g backup-pull /home/backup-pull/.ssh
if [[ -n "${BACKUP_PULL_KEYS:-}" && -s "$HERE/$BACKUP_PULL_KEYS" ]]; then
  sed 's#^\(ssh-\)#from="100.64.0.0/10,fd7a:115c:a1e0::/48",command="rrsync -ro /var/backups/cocoso",restrict \1#' \
    "$HERE/$BACKUP_PULL_KEYS" > /home/backup-pull/.ssh/authorized_keys
fi
touch /home/backup-pull/.ssh/authorized_keys
chown backup-pull:backup-pull /home/backup-pull/.ssh/authorized_keys; chmod 600 /home/backup-pull/.ssh/authorized_keys

# GitHub Actions deploys: may run cocoso-deploy and nothing else.
id deploy >/dev/null 2>&1 || useradd -m -s /bin/sh -c "GitHub Actions deploy (only cocoso-deploy)" deploy
passwd -l deploy >/dev/null
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
if [[ -n "${DEPLOY_KEY:-}" && -s "$HERE/$DEPLOY_KEY" ]]; then
  sed 's#^\(ssh-\)#from="100.64.0.0/10,fd7a:115c:a1e0::/48",command="sudo -n /usr/local/sbin/cocoso-deploy",restrict \1#' \
    "$HERE/$DEPLOY_KEY" > /home/deploy/.ssh/authorized_keys
fi
touch /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys; chmod 600 /home/deploy/.ssh/authorized_keys
install -m 440 "$FILES/etc/sudoers.d/91-deploy" /etc/sudoers.d/91-deploy
visudo -c >/dev/null

step "3/9 ssh: keys only, no root, three users"
sed "s/<admin>/$ADMIN_USER/" "$FILES/etc/ssh/sshd_config.d/00-0-hardening.conf" \
  > /etc/ssh/sshd_config.d/00-0-hardening.conf
# The provider's file turns root and password login back on; it sorts first.
for f in /etc/ssh/sshd_config.d/00-hostup-auth.conf; do
  [[ -f "$f" ]] && mv "$f" "/root/$(basename "$f").disabled"
done
sshd -t
systemctl reload ssh

step "4/9 firewall"
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw limit 22/tcp comment ssh >/dev/null
ufw allow 80/tcp comment http >/dev/null
ufw allow 443/tcp comment https >/dev/null
ufw allow 443/udp comment http3 >/dev/null
ufw allow in on tailscale0 comment tailnet >/dev/null
ufw allow 41641/udp comment tailscale >/dev/null
ufw --force enable >/dev/null
ufw status | sed -n 1,3p

step "5/9 fail2ban, resolver, automatic security updates"
install -m 644 "$FILES/etc/fail2ban/jail.d/hardening.conf" /etc/fail2ban/jail.d/hardening.conf
systemctl enable --now fail2ban >/dev/null 2>&1
fail2ban-client reload >/dev/null
install -d /etc/systemd/resolved.conf.d
install -m 644 "$FILES/etc/systemd/resolved.conf.d/10-no-llmnr.conf" /etc/systemd/resolved.conf.d/
systemctl restart systemd-resolved 2>/dev/null || true
install -m 644 "$FILES/etc/apt/apt.conf.d/20auto-upgrades" /etc/apt/apt.conf.d/20auto-upgrades
# The provider's image masks these, so no update was ever installed.
systemctl unmask apt-daily.service apt-daily-upgrade.service apt-daily.timer apt-daily-upgrade.timer unattended-upgrades.service >/dev/null 2>&1
systemctl enable --now apt-daily.timer apt-daily-upgrade.timer unattended-upgrades.service >/dev/null 2>&1

step "6/9 Caddy"
sed "s/kalendern\.example\.org/$DOMAIN/g" "$FILES/etc/caddy/Caddyfile" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl enable caddy >/dev/null 2>&1
systemctl reload-or-restart caddy

step "7/9 /opt/cocoso"
install -d -m 750 -o "$ADMIN_USER" -g "$ADMIN_USER" /opt/cocoso
install -m 644 -o "$ADMIN_USER" -g "$ADMIN_USER" "$FILES/opt/cocoso/docker-compose.yml" /opt/cocoso/docker-compose.yml
install -m 755 -o "$ADMIN_USER" -g "$ADMIN_USER" "$FILES/opt/cocoso/deploy.sh" /opt/cocoso/deploy.sh
if [[ ! -f /opt/cocoso/settings.json ]]; then
  install -m 644 -o "$ADMIN_USER" -g "$ADMIN_USER" "$FILES/opt/cocoso/settings.example.json" /opt/cocoso/settings.json
  echo "fill in /opt/cocoso/settings.json"
fi
if [[ ! -f /opt/cocoso/.env ]]; then
  install -m 600 -o "$ADMIN_USER" -g "$ADMIN_USER" "$FILES/opt/cocoso/env.example" /opt/cocoso/.env
  echo "fill in /opt/cocoso/.env"
fi

step "8/9 deploy and backup"
install -m 755 "$FILES/usr/local/sbin/cocoso-deploy" /usr/local/sbin/cocoso-deploy
install -m 755 "$FILES/usr/local/sbin/cocoso-backup" /usr/local/sbin/cocoso-backup
install -m 644 "$FILES/etc/systemd/system/cocoso-backup.service" "$FILES/etc/systemd/system/cocoso-backup.timer" /etc/systemd/system/
install -d -m 750 -g backup /var/backups/cocoso
systemctl daemon-reload
systemctl enable --now cocoso-backup.timer >/dev/null 2>&1

step "9/9 Tailscale"
systemctl enable --now tailscaled >/dev/null 2>&1
if ! tailscale status >/dev/null 2>&1; then
  echo "log in: tailscale up --hostname=<name>, then tag the machine tag:server in the admin console"
fi

echo
echo "Done. Next: fill in settings.json and .env if new, deploy (README.md), then"
echo "check: ssh $ADMIN_USER@<server> works BEFORE closing this root session."
