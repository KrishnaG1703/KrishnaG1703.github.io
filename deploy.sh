#!/bin/sh
# Publish the site to https://krishnaganga.pages.dev
# Copies only what the site needs (serve.py and the repo metadata stay behind),
# then hands the folder to Cloudflare Pages.
set -e
cd "$(dirname "$0")"
DIST=$(mktemp -d)
cp index.html style.css main.js model.js "$DIST"/
cp -R assets "$DIST"/assets
find "$DIST" -name '.DS_Store' -delete
npx --yes wrangler@latest pages deploy "$DIST" \
  --project-name krishnaganga --branch master --commit-dirty=true
rm -rf "$DIST"
