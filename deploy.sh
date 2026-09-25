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
cp -R city "$DIST"/city
find "$DIST" -name '.DS_Store' -delete
# the link-preview tags name GitHub Pages; point this copy's previews at itself
sed -i.bak 's#https://krishnag1703.github.io/#https://krishnaganga.pages.dev/#g' "$DIST/index.html" && rm "$DIST/index.html.bak"
npx --yes wrangler@latest pages deploy "$DIST" \
  --project-name krishnaganga --branch master --commit-dirty=true
rm -rf "$DIST"
