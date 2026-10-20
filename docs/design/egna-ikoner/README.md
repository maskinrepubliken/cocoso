# Our own 3D icons: sevärdhet and fotboll

`public/3dicons/sevardhet.webp` (⌘, the Swedish road sign for a
sevärdhet) and `public/3dicons/fotboll.webp` are not from 3dicons.co. They
are modelled and rendered with three.js to sit next to that set: the
dynamic camera angle, soft studio light, a diagonal colour gradient on the
⌘ like the set's glyphs (`hash`, `at`), trimmed and scaled to 320 px WebP.
The ⌘ is brown, the colour of Swedish tourist signs.

- `render.html`: builds and lights the model (`buildSevardhet`,
  `buildFotboll`) and renders it with a transparent background. The ⌘ is
  its outline with holes (`commandShape`), extruded with a deep round
  bevel; the ball is a sphere painted with the 12 pentagons and 20 hexagons
  of a truncated icosahedron, with the seams pressed in by a bump map.
- `render.js`: serves the page, renders it in headless Chromium
  (Playwright, software WebGL), writes `<name>-1024.png` (the full
  render, 1536 px despite the name) and `<name>.webp` (trimmed, 320 px).
- `*-preview.png`, `comparison.png`: the current renders, and the two next
  to icons from the set.

To re-render (Playwright installed, `require('playwright')` resolvable):

    cd docs/design/egna-ikoner
    npm install --no-save three@0.169.0
    node render.js sevardhet sevardhet
    node render.js fotboll fotboll
    cp sevardhet.webp fotboll.webp ../../../public/3dicons/

Shape and colour can be tried from the command line without editing:
`node render.js sevardhet test "&s=0.72&r=0.56&w=0.18&from=%235a2a12&to=%23e8a050&env=0.45"`
(`s` half the centre square, `r` the loops' radius, `w` half the stroke,
`from`/`to` the gradient, `env` the reflections, `rough` the gloss).
