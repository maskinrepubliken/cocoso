// Writes the data pack a new instance is bootstrapped with
// (private/bootstrap/<pack>/, read by imports/startup/server/bootstrap.ts)
// from a configured site: its places (locations), its venues (resources),
// the request kinds (work categories) and its pages.
//
//   mongosh --quiet "mongodb://mongo:27017/cocoso" --eval 'var PACK = "tranemo"' \
//     --file scripts/export-bootstrap-pack.mongosh.js
//
// Run from the checkout root. Ids, authors and dates are left out; a venue
// names its place by slug. Pictures uploaded to this server's own /media
// are dropped, since a new instance does not have the files; linked
// pictures (Wikimedia Commons) are kept. Example content (isExample) is
// never exported.

const fs = require('fs');
const pack = typeof PACK === 'string' ? PACK : 'tranemo';
const dir = `private/bootstrap/${pack}`;
fs.mkdirSync(dir, { recursive: true });

const write = (name, docs) => {
  fs.writeFileSync(`${dir}/${name}.json`, JSON.stringify(docs, null, 2) + '\n');
  print(`${name}: ${docs.length}`);
};
const pick = (doc, keys) =>
  Object.fromEntries(keys.filter((k) => doc[k] !== undefined).map((k) => [k, doc[k]]));
const linkedOnly = (images = []) => images.filter((url) => !url.includes('/media/'));
const notExample = { isExample: { $ne: true } };

const locations = db.locations.find(notExample).sort({ order: 1 }).toArray();
const slugById = Object.fromEntries(locations.map((l) => [l._id, l.slug]));
write(
  'locations',
  locations.map((l) => ({
    ...pick(l, ['slug', 'name', 'description', 'isPublished', 'order']),
    images: linkedOnly(l.images),
  }))
);

write(
  'resources',
  db.resources
    .find({ ...notExample, isCombo: { $ne: true } })
    .sort({ label: 1 })
    .toArray()
    .map((r) => ({
      ...pick(r, ['label', 'description', 'isBookable', 'address', 'kinds', 'contact', 'booking']),
      images: linkedOnly(r.images),
      ...(r.locationId && slugById[r.locationId] ? { location: slugById[r.locationId] } : {}),
    }))
);

write(
  'categories',
  db.categories.find(notExample).toArray().map((c) => pick(c, ['type', 'label']))
);

write(
  'pages',
  db.pages
    .find(notExample)
    .sort({ order: 1 })
    .toArray()
    .map((p) => pick(p, ['title', 'longDescription', 'isPublished', 'order']))
);
