/* global db */
// Seeds the förfrågningar: the request kinds as work categories, example
// requests from the example organizers, and the menu label.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-example-requests.mongosh.js
//
// Run tranemo-example-events.mongosh.js first: the requests are made by its
// example organizers. The kind labels must match REQUEST_KINDS in
// imports/ui/pages/works/requestKinds.ts.
//
// Idempotent: categories are matched by label, requests by title. To remove
// the requests:
//   db.works.deleteMany({ title: { $in: [...the titles below] } })

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
function meteorId() {
  let id = '';
  for (let i = 0; i < 17; i += 1) id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return id;
}

const location = (slug) => db.locations.findOne({ slug })?._id;
const admin = db.users.findOne({ username: 'lyret' }) || db.users.findOne();

const KINDS = ['samåkning', 'låna ut', 'vill låna', 'ge bort', 'hjälp sökes', 'sällskap', 'tips'];
const categoryId = {};
KINDS.forEach((label) => {
  const existing = db.categories.findOne({ label });
  if (existing) {
    categoryId[label] = existing._id;
    return;
  }
  const _id = meteorId();
  db.categories.insertOne({
    _id,
    type: 'work',
    label,
    addedBy: admin._id,
    addedUsername: admin.username,
    addedDate: new Date(),
  });
  categoryId[label] = _id;
});

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const contact = 'Skicka ett meddelande via min profil.';

const requests = [
  {
    kind: 'samåkning',
    author: 'erik.johansson',
    locationId: location('tranemo'),
    title: 'Samåkning Tranemo–Borås på vardagar',
    shortDescription: 'Kör kl 7.15 från Centralen, hem från Borås 16.30. Två platser lediga.',
    longDescription:
      '<p>Jag pendlar till Borås varje vardag och har två lediga platser. Avgång 7.15 från Centralen i Tranemo, hemresa 16.30 från resecentrum i Borås.</p><p>Vi delar på bensinen, ungefär 40 kr per dag.</p>',
    created: 1,
  },
  {
    kind: 'samåkning',
    author: 'fatima.hassan',
    locationId: location('limmared'),
    title: 'Skjuts till körövningen på tisdagar',
    shortDescription: 'Från Limmared till kyrkan i Tranemo tisdagar kl 18.30. Plats för tre.',
    longDescription:
      '<p>Jag sjunger i kören och kör från Limmared varje tisdag. Det finns plats för tre till – hör av dig om du också vill med!</p>',
    created: 3,
  },
  {
    kind: 'låna ut',
    author: 'lars.svensson',
    locationId: location('uddebo'),
    title: 'Lånar ut släpvagn',
    shortDescription: 'Obromsad släpvagn, 750 kg. Bra till flytt, ris och tippen.',
    longDescription:
      '<p>Släpvagnen står mest still, så låna gärna! Den har kåpa och spännband. Hämtas och lämnas i Uddebo.</p><p>Gratis, men tvätta den gärna efteråt.</p>',
    created: 2,
  },
  {
    kind: 'låna ut',
    author: 'anna.lindqvist',
    locationId: location('tranemo'),
    title: 'Tält och sovsäckar till läger och utflykter',
    shortDescription: 'Två fyramannatält och sex sovsäckar som föreningar och familjer får låna.',
    longDescription:
      '<p>Friluftsföreningen har tält och sovsäckar som du får låna till läger, utflykter eller när släkten kommer på besök.</p>',
    created: 6,
  },
  {
    kind: 'vill låna',
    author: 'erik.johansson',
    locationId: location('limmared'),
    title: 'Vill låna högtryckstvätt en helg',
    shortDescription: 'Ska tvätta altanen innan oljning. Bjuder på fika och lånar gärna ut något tillbaka.',
    longDescription:
      '<p>Någon som har en högtryckstvätt jag kan låna en helg i oktober? Jag hämtar och lämnar.</p>',
    created: 1,
  },
  {
    kind: 'vill låna',
    author: 'fatima.hassan',
    locationId: location('tranemo'),
    title: 'Söker symaskin att låna',
    shortDescription: 'Ska sy gardiner till föreningslokalen. Behöver den ungefär en vecka.',
    longDescription:
      '<p>Vi syr nya gardiner till lokalen och behöver låna en symaskin i en vecka. Den kommer tillbaka i samma skick!</p>',
    created: 5,
  },
  {
    kind: 'ge bort',
    author: 'anna.lindqvist',
    locationId: location('uddebo'),
    title: 'Barncykel 16 tum ges bort',
    shortDescription: 'Röd barncykel med stödhjul, passar 4–6 år. Hämtas i Uddebo.',
    longDescription:
      '<p>Vår yngsta har vuxit ur cykeln. Den fungerar fint men kedjan behöver lite olja. Först till kvarn!</p>',
    created: 0,
  },
  {
    kind: 'ge bort',
    author: 'lars.svensson',
    locationId: location('limmared'),
    title: 'Plocka äpplen gratis',
    shortDescription: 'Tre fulla träd med Aroma och Ingrid Marie. Ta med egen kasse.',
    longDescription:
      '<p>Vi hinner inte ta vara på alla äpplen. Kom och plocka – trädgården ligger vid Glasets Hus. Ring på så visar jag vägen.</p>',
    created: 4,
  },
  {
    kind: 'hjälp sökes',
    author: 'anna.lindqvist',
    locationId: location('tranemo'),
    title: 'Hjälp att bära en soffa på lördag',
    shortDescription: 'En soffa ska upp två trappor. Tar en halvtimme, jag bjuder på kaffe och bulle.',
    longDescription:
      '<p>Behöver två starka armar till på lördag förmiddag. Soffan ska från ett släp upp till andra våningen på Storgatan.</p>',
    created: 2,
  },
  {
    kind: 'hjälp sökes',
    author: 'lars.svensson',
    locationId: location('limmared'),
    title: 'Någon som kan handla åt en äldre granne?',
    shortDescription: 'En gång i veckan, helst torsdagar. Hon betalar med Swish och bjuder på kaffe.',
    longDescription:
      '<p>Min granne har svårt att ta sig till affären i vinter. Finns det någon som handlar i Limmared ändå och kan ta med hennes lista?</p>',
    created: 7,
  },
  {
    kind: 'sällskap',
    author: 'fatima.hassan',
    locationId: location('tranemo'),
    title: 'Promenadsällskap runt Tranemosjön',
    shortDescription: 'Söndagar kl 10, i lugnt tempo. Alla är välkomna, även hundar.',
    longDescription:
      '<p>Jag går runt sjön varje söndag och vill gärna ha sällskap. Vi träffas vid badplatsen och går ungefär en timme.</p>',
    created: 3,
  },
  {
    kind: 'sällskap',
    author: 'erik.johansson',
    locationId: location('uddebo'),
    title: 'Löparkompis sökes',
    shortDescription: 'Springer 5–8 km två kvällar i veckan, runt 6 min/km.',
    longDescription:
      '<p>Det är lättare att komma ut när någon väntar. Vill du springa med mig i Uddebo på tisdagar och torsdagar?</p>',
    created: 8,
  },
  {
    kind: 'tips',
    author: 'anna.lindqvist',
    isMunicipalityOnly: true,
    title: 'Tips: lånecyklar och sportutrustning på biblioteket',
    shortDescription: 'Skridskor, snöskor och cykelhjälmar går att låna gratis med lånekort.',
    longDescription:
      '<p>Visste du att biblioteket lånar ut mer än böcker? Fråga i disken – det finns skridskor, snöskor, stavar och cykelhjälmar.</p>',
    created: 4,
  },
  {
    kind: 'tips',
    author: 'lars.svensson',
    locationId: location('uddebo'),
    title: 'Tips: höstmarknad och loppis i Uddebo',
    shortDescription: 'Lokala hantverkare, äppelmust och loppis i ladan hela lördagen.',
    longDescription:
      '<p>Missa inte höstmarknaden i Uddebo! Där finns hantverk, must från bygdens äpplen och en stor loppis i ladan.</p>',
    created: 1,
  },
];

let created = 0;
requests.forEach((r) => {
  if (db.works.findOne({ title: r.title })) return;
  const user = db.users.findOne({ username: r.author });
  if (!user) {
    print(`skipped "${r.title}": no user ${r.author}`);
    return;
  }
  const doc = {
    _id: meteorId(),
    title: r.title,
    shortDescription: r.shortDescription,
    longDescription: r.longDescription,
    additionalInfo: '',
    contactInfo: contact,
    category: { label: r.kind, categoryId: categoryId[r.kind] },
    images: [],
    documents: [],
    showAvatar: true,
    authorId: user._id,
    authorUsername: user.username,
    authorAvatar: user.avatar?.src || null,
    creationDate: daysAgo(r.created),
    isMunicipalityOnly: Boolean(r.isMunicipalityOnly),
  };
  if (r.locationId) doc.locationId = r.locationId;
  db.works.insertOne(doc);
  created += 1;
});

db.site.updateOne(
  { 'settings.menu.name': 'works' },
  {
    $set: {
      'settings.menu.$.label': 'Förfrågningar',
      'settings.menu.$.description':
        'Samåk, låna, ge bort och tipsa varandra – grannar emellan i hela kommunen.',
    },
  }
);

print(`categories: ${KINDS.length}, new requests: ${created}`);
