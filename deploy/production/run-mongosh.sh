#!/usr/bin/env bash
# Runs a mongosh script (e.g. from scripts/migrations/) against the production
# database, from a machine that can SSH to the server as the admin user.
#
#   deploy/production/run-mongosh.sh <admin>@<server> <script.js>          # dry run
#   deploy/production/run-mongosh.sh <admin>@<server> <script.js> --apply  # changes data
#
# --apply sets `var APPLY = true` before the script, the convention the
# scripts use for "really change something". A script that never reads APPLY
# has no dry run and is refused without --apply. Take a fresh backup first
# (sudo cocoso-backup on the server) when it changes data.
#
# Most migrations never need this: a deploy runs the ones listed in
# scripts/migrations/ORDER by itself. This is for the ones marked `manual`
# there, and for other one-off scripts. A script from scripts/migrations/ run
# with --apply is recorded in `dataMigrations`, as the deploy does, so it is
# not waited for or run again.
#
# The script is run from a file in the mongo container, so the first error
# stops it and fails this command.
set -euo pipefail

HOST="${1:-}"; SCRIPT="${2:-}"; MODE="${3:-}"
[[ -n "$HOST" && -r "$SCRIPT" && ( -z "$MODE" || "$MODE" == "--apply" ) ]] \
  || { echo "användning: $0 <admin>@<server> <skript.js> [--apply]" >&2; exit 1; }

if [[ "$MODE" != "--apply" ]] && ! grep -qw APPLY "$SCRIPT"; then
  echo "$SCRIPT läser aldrig APPLY och har därför ingen provkörning: det ändrar data direkt." >&2
  echo "Läs igenom det och kör med --apply om det är det du vill." >&2
  exit 1
fi

name="$(basename "$SCRIPT")"
record=""
if [[ "$MODE" == "--apply" && "$(cd "$(dirname "$SCRIPT")" && pwd -P)" == */scripts/migrations \
      && "$name" =~ ^[A-Za-z0-9._-]+\.mongosh\.js$ ]]; then
  record="db.dataMigrations.updateOne({ _id: \"$name\" }, { \$set: { appliedAt: new Date(), by: \"manual\" } }, { upsert: true }); print(\"bokförd som körd: $name\");"
fi

{
  [[ "$MODE" == "--apply" ]] && echo 'var APPLY = true;'
  cat "$SCRIPT"
  printf '\n;%s\n' "$record"
} | ssh "$HOST" 'cd /opt/cocoso && docker compose exec -T mongo sh -c '"'"'f=/tmp/cocoso-script-$$.js; cat > "$f" && mongosh --quiet cocoso --file "$f"; s=$?; rm -f "$f"; exit $s'"'"
