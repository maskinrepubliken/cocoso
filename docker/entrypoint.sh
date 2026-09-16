#!/bin/sh
# Meteor reads its settings from METEOR_SETTINGS as a JSON string. Compose can
# only hand us a file, so read it here and pass it on.
set -eu

if [ -z "${METEOR_SETTINGS:-}" ] && [ -n "${METEOR_SETTINGS_FILE:-}" ]; then
  if [ ! -r "$METEOR_SETTINGS_FILE" ]; then
    echo "cocoso: cannot read METEOR_SETTINGS_FILE=$METEOR_SETTINGS_FILE" >&2
    exit 1
  fi
  METEOR_SETTINGS="$(cat "$METEOR_SETTINGS_FILE")"
  export METEOR_SETTINGS
fi

exec "$@"
