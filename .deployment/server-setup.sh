#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/mock-preliminary-task}"
APP_USER="${APP_USER:-$USER}"

sudo apt-get update
sudo apt-get install -y ca-certificates curl git nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install --global pm2
fi

sudo mkdir -p "$APP_DIR"
sudo chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

echo "Server base setup complete. Configure GitHub Secrets, then push to main to deploy."
