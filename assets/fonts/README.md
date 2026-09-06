# Lumaire

Lumaire is a commercial typeface. It is not on Google Fonts and cannot be
loaded from a CDN, so it has to be self-hosted from this folder.

Drop the licensed web files here as:

    assets/fonts/lumaire.woff2
    assets/fonts/lumaire.woff

then uncomment the `@font-face` block near the top of `style.css`.

Nothing else needs changing: `--display` already lists `Lumaire` first and
falls back to Italiana until those files exist.
