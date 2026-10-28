# Assets for generated share images

The crane beside the site name is `public/3dicons/trana-hals.webp`, copied
here so the server can read it.

Static instances of the site's two typefaces, used by the server when it
draws the share images (`imports/api/share/shareImage.server.tsx`). The
server has no system fonts to rely on, so the files ship with the app.

- `fonts/fraunces-700.ttf` — Fraunces Bold, opsz 144, SOFT 50 (family name
  "Fraunces 144pt Soft"), the display face of the headings.
- `fonts/raleway-600.ttf`, `fonts/raleway-800.ttf` — Raleway SemiBold and ExtraBold, the
  interface face.

Both are released under the SIL Open Font License 1.1
(https://openfontlicense.org). They were fetched as TrueType from the Google
Fonts CSS API:

    https://fonts.googleapis.com/css2?family=Raleway:wght@600;800&family=Fraunces:opsz,wght,SOFT@144,700,50
