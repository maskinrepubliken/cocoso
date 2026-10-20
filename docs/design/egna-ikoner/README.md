# Our own 3D icons: sevärdhet, fotboll, badring and tält

Four icons in `public/3dicons/` are not from 3dicons.co: `sevardhet.webp` (⌘,
the Swedish road sign for a sevärdhet), `fotboll.webp` (Idrottsplatser),
`badring.webp` (Bad) and `talt.webp` (Friluftsliv). They are modelled
and rendered with three.js to sit next to that set: the dynamic camera
angle, soft studio light, diagonal colour gradients like the set's glyphs
(`hash`, `at`), trimmed and scaled to 320 px WebP. The ⌘ is brown, the
colour of Swedish tourist signs; the reds match the set's (`gym`, `flag`).

- `render.html`: builds and lights the model and renders it with a
  transparent background, one builder per icon:
  - `buildSevardhet`: the ⌘ outline with holes (`commandShape`),
    extruded with a deep round bevel (`s`, `r`, `w`, `from`/`to`).
  - `buildFotboll`: a sphere painted with the 12 pentagons and 20 hexagons
    of a truncated icosahedron, the seams pressed in by a bump map.
  - `buildBadring`: a torus in eight red and white fields (`parts`,
    `tube`, `red`, `rough`, `coat`).
  - `buildTalt`: an A-frame face with a door, extruded, on a rounded
    groundsheet (`from`/`to`, `ground`, `len`).
  - Tried for Friluftsliv and not used: `buildKanga`, a hiking boot (too
    boxy as an extruded side profile), and `buildGran`, a spruce of
    lathe-turned tiers.
- `render.js`: serves the page, renders it in headless Chromium
  (Playwright, software WebGL), writes `<name>-1024.png` (the full
  render, 1536 px despite the name) and `<name>.webp` (trimmed, 320 px).
- `*-preview.png`, `comparison.png`: the renders, and ours next to an
  icon from the set (the boot and the spruce are the unused tries).

To re-render (Playwright installed, `require('playwright')` resolvable):

    cd docs/design/egna-ikoner
    npm install --no-save three@0.169.0
    node render.js sevardhet sevardhet
    node render.js fotboll fotboll
    node render.js badring badring
    node render.js talt talt
    cp sevardhet.webp fotboll.webp badring.webp talt.webp ../../../public/3dicons/

Shape and colour can be tried from the command line without editing:
`node render.js sevardhet test "&s=0.72&r=0.56&w=0.18&from=%235a2a12&to=%23e8a050&env=0.45"`
(`s` half the centre square, `r` the loops' radius, `w` half the stroke,
`from`/`to` the gradient, `env` the reflections, `rough` the gloss).
