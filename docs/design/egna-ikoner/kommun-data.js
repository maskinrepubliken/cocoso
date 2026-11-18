// node kommun-data.js <dir with the OSM downloads>  — writes tranemo-kommun.json,
// the geometry render.html's buildKommun draws: the municipality's outline,
// the land with its lakes cut out, the lakes, and the towns.
//
// The downloads (© OpenStreetMap contributors, ODbL), see README.md:
//   nom.json     Nominatim search "Tranemo kommun" with polygon_geojson=1
//   water.json   Overpass: natural=water ways and relations in the area, out geom
const fs = require('fs'); const path = require('path');
const pc = require('polygon-clipping');
const dir = process.argv[2] || '.';
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

// Lakes smaller than this are left out, and shores are simplified to this
// tolerance; the municipal boundary is kept point for point.
const MIN_LAKE_KM2 = Number(process.env.MIN_LAKE_KM2 || 0.08);
const LAKE_TOLERANCE_KM = 0.03;

// The towns of SCB's "Befolkningens andel per tätort (%) 2025", placed at
// their OSM place nodes
const towns = [
  ['Tranemo', 57.4848901, 13.3518567, 29.62],
  ['Limmared', 57.5373883, 13.3565985, 12.45],
  ['Länghem', 57.6011776, 13.2428893, 8.66],
  ['Dalstorp', 57.6057692, 13.5113863, 6.11],
  ['Grimsås', 57.4848482, 13.5519542, 5.62],
  ['Ambjörnarp', 57.4213149, 13.2945589, 2.53],
  ['Uddebo', 57.4739744, 13.26539, 2.26],
  ['Sjötofta', 57.357705, 13.2871569, 1.92],
  ['Nittorp', 57.5479754, 13.4890342, 1.81],
  ['Ljungsarp', 57.5646493, 13.5840219, 1.67],
  ['Ölsremma', 57.620083, 13.6196546, 1.03],
  ['Månstad', 57.6052375, 13.3466034, 0.67],
  ['Hulared', 57.5961141, 13.4200083, 0.51],
];

const boundary = read('nom.json').find((r) => r.osm_type === 'relation' && r.class === 'boundary').geojson;
const boundaryLL = boundary.type === 'Polygon' ? [boundary.coordinates] : boundary.coordinates;

// Kilometres east and north of the outline's centre: at this size (some
// 40 × 55 km) an equirectangular projection is off by a few metres at most
let w = Infinity, e = -Infinity, s = Infinity, n = -Infinity;
boundaryLL.forEach((poly) => poly[0].forEach(([lon, lat]) => { w = Math.min(w, lon); e = Math.max(e, lon); s = Math.min(s, lat); n = Math.max(n, lat); }));
const lon0 = (w + e) / 2, lat0 = (s + n) / 2;
const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180), ky = 111.2;
const project = ([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * ky];
const outline = boundaryLL.map((poly) => poly.map((ring) => ring.map(project)));

const ringArea = (r) => { let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a / 2; };
const polyArea = (p) => Math.abs(ringArea(p[0])) - p.slice(1).reduce((sum, h) => sum + Math.abs(ringArea(h)), 0);

// Douglas–Peucker on a closed ring
function simplify(ring, tol) {
  const pts = ring.slice(0, -1);
  if (pts.length < 8) return ring;
  const keep = new Uint8Array(pts.length); keep[0] = 1;
  // split at the point farthest from the first, so both halves are open lines
  let far = 0, fd = 0;
  pts.forEach((p, i) => { const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (d > fd) { fd = d; far = i; } });
  keep[far] = 1;
  const dp = (a, b) => {
    const [ax, ay] = pts[a], [bx, by] = pts[b % pts.length];
    const len = Math.hypot(bx - ax, by - ay) || 1e-9;
    let worst = -1, wd = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > wd) { wd = d; worst = i; }
    }
    if (worst > 0) { keep[worst] = 1; dp(a, worst); dp(worst, b); }
  };
  dp(0, far); dp(far, pts.length);
  const out = pts.filter((_, i) => keep[i]);
  return out.length < 4 ? ring : [...out, out[0]];
}

// Join the member ways of a multipolygon relation into closed rings
function stitch(ways) {
  const rings = []; const open = ways.map((g) => g.slice());
  while (open.length) {
    let ring = open.pop();
    const same = (a, b) => a[0] === b[0] && a[1] === b[1];
    while (!same(ring[0], ring[ring.length - 1])) {
      const end = ring[ring.length - 1];
      const i = open.findIndex((g) => same(g[0], end) || same(g[g.length - 1], end));
      if (i < 0) break;
      const [next] = open.splice(i, 1);
      ring = ring.concat((same(next[0], end) ? next : next.reverse()).slice(1));
    }
    if (ring.length > 3 && same(ring[0], ring[ring.length - 1])) rings.push(ring);
  }
  return rings;
}

const geom = (g) => g.map((p) => project([p.lon, p.lat]));
const skip = new Set(['river', 'canal', 'stream', 'ditch', 'wastewater', 'basin']);
const lakePolys = [];
for (const el of read('water.json').elements) {
  if (skip.has(el.tags && el.tags.water)) continue;
  if (el.type === 'way') {
    const ring = geom(el.geometry);
    if (ring.length > 3) lakePolys.push([ring]);
  } else if (el.type === 'relation') {
    const outers = stitch(el.members.filter((m) => m.type === 'way' && m.role !== 'inner' && m.geometry).map((m) => geom(m.geometry)));
    const inners = stitch(el.members.filter((m) => m.type === 'way' && m.role === 'inner' && m.geometry).map((m) => geom(m.geometry)));
    // islands are cut out below, when the lakes are subtracted from the land
    outers.forEach((o) => lakePolys.push([o, ...inners]));
  }
}

const big = lakePolys
  .filter((p) => Math.abs(ringArea(p[0])) >= MIN_LAKE_KM2)
  .map((p) => [simplify(p[0], LAKE_TOLERANCE_KM), ...p.slice(1).filter((h) => Math.abs(ringArea(h)) > 0.01).map((h) => simplify(h, LAKE_TOLERANCE_KM))]);
// Only the part of a lake that lies inside the municipality, and the land
// as what is left of the outline: a lake on the boundary becomes a bay
const lakes = pc.intersection(outline, pc.union(...big)).filter((p) => polyArea(p) >= MIN_LAKE_KM2 / 2);
// (slivers of land, such as islets cut off by a lake on the boundary, are
// too small to carry the slab's rounded edge and are left as water)
const land = pc.difference(outline, lakes).filter((p) => polyArea(p) >= 0.05);

const round = (multi) => multi.map((poly) => poly.map((ring) => ring.map(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4])));
const out = {
  source: '© OpenStreetMap contributors (ODbL): boundary relation 935584, natural=water; shares: SCB 2025',
  unit: 'km east and north of the centre',
  centre: [lon0, lat0],
  outline: round(outline),
  land: round(land),
  lakes: round(lakes),
  towns: towns.map(([name, lat, lon, share]) => { const [x, y] = project([lon, lat]); return { name, x: Math.round(x * 1e3) / 1e3, y: Math.round(y * 1e3) / 1e3, share }; }),
};
fs.writeFileSync(path.join(__dirname, 'tranemo-kommun.json'), JSON.stringify(out));
const count = (multi) => multi.reduce((sum, poly) => sum + poly.reduce((k, ring) => k + ring.length, 0), 0);
console.log(`outline ${outline.length} polygon(s), ${count(outline)} points, ${outline.reduce((a, p) => a + polyArea(p), 0).toFixed(1)} km²`);
console.log(`lakes ${lakes.length}, ${count(lakes)} points, ${lakes.reduce((a, p) => a + polyArea(p), 0).toFixed(1)} km²; land ${land.length} polygon(s), ${count(land)} points`);
