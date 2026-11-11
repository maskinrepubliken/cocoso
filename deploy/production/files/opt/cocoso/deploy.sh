#!/usr/bin/env bash
# Deploys are made by GitHub Actions when the production branch moves
# (.github/workflows/deploy.yml). By hand: rolls out :production with a
# health check and rollback.
exec sudo /usr/local/sbin/cocoso-deploy
