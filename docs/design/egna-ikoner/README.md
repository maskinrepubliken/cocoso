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

## Tranemo kommun as a 3D map

`public/3dicons/tranemo-kommun.webp` (640 px) is the municipality as a green
slab in the same style: the municipal boundary point for point, the lakes
sunk into it, and a red ball per town whose area follows the town's share
of the population (SCB, "Befolkningens andel per tätort (%) 2025"), like
the circles on SCB's map. No town names yet.

- `kommun-data.js`: turns two OpenStreetMap downloads into
  `tranemo-kommun.json` (kilometres east and north of the centre): the
  outline, the land with the lakes cut out, the lakes (0.08 km² and up,
  clipped to the boundary) and the towns with their shares. Lakes on the
  boundary become bays, so the outline stays exact.
- `buildKommun` in `render.html`: extrudes the land with a rounded edge
  that never reaches outside the boundary, fills the lakes, places the
  balls (`thick`, `bevel`, `shore`, `town`, `lift`, `rx`/`rz`,
  `from`/`to`, `lakeFrom`/`lakeTo`, `redFrom`/`redTo`).

To re-render (the fourth argument is the WebP's longest side):

    node render.js kommun tranemo-kommun "" 640
    cp tranemo-kommun.webp ../../../public/3dicons/

To rebuild the geometry, download the boundary and the water (send a
User-Agent; any Overpass server will do) and run the script:

    curl -A cocoso-map-icon -o nom.json 'https://nominatim.openstreetmap.org/search?q=Tranemo+kommun&format=json&polygon_geojson=1'
    curl -A cocoso-map-icon -o water.json https://overpass-api.de/api/interpreter --data-urlencode \
      'data=[out:json][timeout:150];area(3600935584)->.a;(way["natural"="water"](area.a);relation["natural"="water"](area.a););out geom;'
    npm install --no-save polygon-clipping
    node kommun-data.js .

The geometry is © OpenStreetMap contributors (ODbL): credit OpenStreetMap
where the map is shown.

Shape and colour can be tried from the command line without editing:
`node render.js sevardhet test "&s=0.72&r=0.56&w=0.18&from=%235a2a12&to=%23e8a050&env=0.45"`
(`s` half the centre square, `r` the loops' radius, `w` half the stroke,
`from`/`to` the gradient, `env` the reflections, `rough` the gloss).
