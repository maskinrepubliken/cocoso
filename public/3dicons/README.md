# 3dicons

Soft 3D icons from https://3dicons.co by Vijay Verma, released under CC0 1.0
(no rights reserved, no attribution required). This folder holds the
"dynamic" camera angle in the "color" style, trimmed and scaled to 320 px
WebP. The `<name>-front.webp` files are the "front" angle of the same
icons (seen straight on), for the rows of the phone's menu: one for each
section icon, the star and the magnifier. The full set (124
icons, four styles, three angles, Blender sources) is at
https://3dicons.co. Add more by dropping `<name>.webp` here and using
`<ThreeDIcon name="<name>" />` from `imports/ui/generic/ThreeDIcon`.

`trana.webp` is not from 3dicons.co: it is our own crane (Tranemo's trana),
modelled and rendered in Blender to match the set. Source, script and
render pipeline are in `docs/design/trana/`.

`sevardhet.webp` (⌘), `fotboll.webp`, `badring.webp` and `talt.webp` are not from
3dicons.co either: they are
rendered with three.js to match the set; see `docs/design/egna-ikoner/`.

`tranemo-kommun.webp` (640 px) and `tranemo-kommun-stor.webp` (1400 px, what
`KommunMap` zooms up to) are the municipality as a 3D map with a red
ball per town, rendered the same way from OpenStreetMap's boundary and
lakes (© OpenStreetMap contributors, ODbL); see `docs/design/egna-ikoner/`.
