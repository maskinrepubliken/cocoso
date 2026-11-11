#!/usr/bin/env bash
# Runs a mongosh script (e.g. from scripts/migrations/) against the production
# database, from a machine that can SSH to the server as the admin user.
#
#   deploy/production/run-mongosh.sh <admin>@<server> <script.js>          # dry run
#   deploy/production/run-mongosh.sh <admin>@<server> <script.js> --apply  # changes data
#
# --apply sets `var APPLY = true` before the script, the convention the
# migration scripts use for "really change something". Take a fresh backup
# first (sudo cocoso-backup on the server) when it changes data.
set -euo pipefail

HOST="${1:-}"; SCRIPT="${2:-}"; MODE="${3:-}"
[[ -n "$HOST" && -r "$SCRIPT" ]] || { echo "användning: $0 <admin>@<server> <skript.js> [--apply]" >&2; exit 1; }

{
  [[ "$MODE" == "--apply" ]] && echo 'var APPLY = true;'
  cat "$SCRIPT"
} | ssh "$HOST" 'cd /opt/cocoso && docker compose exec -T mongo mongosh --quiet cocoso' \
  | grep -v -E '^(rs0 \[direct: primary\] cocoso> ?|\| )+$' | sed -E 's/^(rs0 \[direct: primary\] cocoso> )+//'
