#!/bin/sh
# Publish the site to https://krishnaganga.pages.dev
# Copies only what the site needs (serve.py and the repo metadata stay behind),
# then hands the folder to Cloudflare Pages.
set -e
cd "$(dirname "$0")"
DIST=$(mktemp -d)
# Every page file by name, so a new script cannot be left behind the way
# chat.js was: Pages answers a missing file with index.html, so the otter
# was loading the page as its own source and dying on the first tag.
for f in index.html style.css main.js model.js chat.js; do cp "$f" "$DIST"/; done
cp -R assets "$DIST"/assets
find "$DIST" -name '.DS_Store' -delete
npx --yes wrangler@latest pages deploy "$DIST" \
  --project-name krishnaganga --branch master --commit-dirty=true
rm -rf "$DIST"
