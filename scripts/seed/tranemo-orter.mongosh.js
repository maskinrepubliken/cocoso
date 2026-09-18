// Seeds the municipality's places and files the existing resources under them.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-orter.mongosh.js
//
// Idempotent: places are matched by slug, and a resource is only assigned
// when it has no location yet. Resources whose label does not name one of
// the places stay municipality-wide.

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
function meteorId() {
  let id = '';
  for (let i = 0; i < 17; i += 1) id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return id;
}

const places = [
  {
    slug: 'tranemo',
    name: 'Tranemo tätort',
    description: '<p>Kommunens centralort vid Tranemosjön, med Centralen, biblioteket, simhallen och Tranehov.</p>',
    // Label patterns that mean "in Tranemo tätort".
    patterns: [/, Tranemo$/, /^Tranemo /, /Tranemosjön/, /Tranehov/, /Hagatorpet/, /Kroksjön/],
  },
  {
    slug: 'uddebo',
    name: 'Uddebo',
    description: '<p>Byn vid Assman med det gamla väveriet, i dag fullt av verkstäder, bageri och kultur.</p>',
    patterns: [/Uddebo/],
  },
  {
    slug: 'limmared',
    name: 'Limmared',
    description: '<p>Glasbruksorten med Glasets Hus, Sveriges äldsta glasbruk i drift.</p>',
    patterns: [/Limmared/],
  },
];

places.forEach((place, order) => {
  const existing = db.locations.findOne({ slug: place.slug });
  if (!existing) {
    db.locations.insertOne({
      _id: meteorId(),
      slug: place.slug,
      name: place.name,
      description: place.description,
      images: [],
      isPublished: true,
      order,
      createdAt: new Date(),
    });
    print(`created ${place.name}`);
  } else {
    print(`exists  ${place.name}`);
  }
});

let assigned = 0;
db.resources.find({ locationId: { $exists: false } }).forEach((resource) => {
  const place = places.find((p) => p.patterns.some((re) => re.test(resource.label)));
  if (!place) return;
  const location = db.locations.findOne({ slug: place.slug });
  db.resources.updateOne({ _id: resource._id }, { $set: { locationId: location._id } });
  db.activities.updateMany({ resourceId: resource._id }, { $set: { locationId: location._id } });
  print(`  ${resource.label} -> ${place.name}`);
  assigned += 1;
});
print(`assigned ${assigned} resource(s)`);
print(`without a place: ${db.resources.countDocuments({ locationId: { $exists: false } })}`);
