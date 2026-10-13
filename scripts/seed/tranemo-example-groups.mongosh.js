// Seeds example föreningar (groups) so the Föreningar listing has content.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-example-groups.mongosh.js
//
// Run tranemo-example-events.mongosh.js first: the groups are run by its
// example organizers. Photos are the Wikimedia Commons pictures of the
// seeded places (see tranemo-resource-images.mongosh.js), credited in the
// description; groups without a fitting photo get the drawn placeholder.
//
// Idempotent: groups are matched by title. To remove them:
//   db.groups.deleteMany({ title: { $in: [...the titles below] } })

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
function meteorId() {
  let id = '';
  for (let i = 0; i < 17; i += 1) id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return id;
}

const THUMB = 'https://thumb.wikimedia.org/wikipedia/commons/thumb';
const location = (slug) => db.locations.findOne({ slug })?._id;

const groups = [
  {
    title: 'Glasets vänner i Limmared',
    readingMaterial: 'Vi värnar Sveriges äldsta glasbruk i drift',
    admin: 'lars.svensson',
    members: ['erik.johansson'],
    locationId: location('limmared'),
    imageUrl: `${THUMB}/7/72/Glasets_Hus.jpg/1280px-Glasets_Hus.jpg`,
    description:
      '<p>Föreningen för alla som tycker om glas. Vi ordnar studiebesök på bruket, föreläsningar om glasets historia och öppna verkstadsdagar i Glasets Hus.</p><p>Nya medlemmar är alltid välkomna, ingen förkunskap behövs.</p><p><em>Foto: Hansnerstu (CC BY-SA 4.0, Wikimedia Commons).</em></p>',
  },
  {
    title: 'Tranemo friluftsförening',
    readingMaterial: 'Vandring, paddling och fika ute året runt',
    admin: 'erik.johansson',
    members: ['anna.lindqvist', 'fatima.hassan'],
    locationId: location('tranemo'),
    imageUrl: `${THUMB}/5/52/Tranemosj%C3%B6n_120731.jpg/1280px-Tranemosj%C3%B6n_120731.jpg`,
    description:
      '<p>Vi går, paddlar och eldar tillsammans runt Tranemosjön och i skogarna omkring. Varje månad finns en längre tur, och på vintern åker vi skridskor när isen bär.</p><p><em>Foto: Ulkl (public domain, Wikimedia Commons).</em></p>',
  },
  {
    title: 'Länghems hembygdsförening',
    readingMaterial: 'Bygdens historia, hus och berättelser',
    admin: 'anna.lindqvist',
    members: ['lars.svensson'],
    imageUrl: `${THUMB}/c/ca/Torpa_stenhuset.JPG/1280px-Torpa_stenhuset.JPG`,
    description:
      '<p>Vi samlar och berättar Länghemsbygdens historia: gamla fotografier, gårdarnas namn och minnen från Torpa och Hofsnäs. Vi ordnar guidade vandringar och en höstmarknad.</p><p><em>Foto: Artifex (CC BY-SA 3.0, Wikimedia Commons).</em></p>',
  },
  {
    title: 'Tranemo schackklubb',
    readingMaterial: 'Schack för alla åldrar på biblioteket',
    admin: 'fatima.hassan',
    members: ['erik.johansson'],
    locationId: location('tranemo'),
    imageUrl: `${THUMB}/5/51/Centralen%2C_Tranemo_-_20250616_-_01.jpg/1280px-Centralen%2C_Tranemo_-_20250616_-_01.jpg`,
    description:
      '<p>Vi spelar varje vecka på biblioteket i Centralen, både snabbschack och långpartier. Nybörjare får en egen tränare de första gångerna.</p><p><em>Foto: AleWi (CC BY-SA 4.0, Wikimedia Commons).</em></p>',
  },
  {
    title: 'Uddebo textilkollektiv',
    readingMaterial: 'Väv, tryck och garn i det gamla väveriet',
    admin: 'lars.svensson',
    members: ['anna.lindqvist'],
    locationId: location('uddebo'),
    imageUrl: '',
    description:
      '<p>Ett kollektiv av vävare, tryckare och stickare som delar verkstad i Väveriet. Vi håller kurser, lånar ut vävstolar och ställer ut tillsammans varje höst.</p>',
  },
  {
    title: 'Tranemo kammarkör',
    readingMaterial: 'Vi sjunger allt från folkvisor till Bach',
    admin: 'anna.lindqvist',
    members: ['fatima.hassan', 'lars.svensson'],
    imageUrl: '',
    description:
      '<p>En kör för hela kommunen med ett trettiotal sångare. Vi repeterar på tisdagskvällar och sjunger på luciakonserten i Glasets Hus och vid adventsmarknaden.</p><p>Vi söker särskilt fler tenorer och basar.</p>',
  },
];

const userBy = (username) => db.users.findOne({ username });

let created = 0;
groups.forEach((g) => {
  if (db.groups.findOne({ title: g.title })) return;
  const admin = userBy(g.admin);
  if (!admin) {
    print(`skipped "${g.title}": run the events seed first (no ${g.admin})`);
    return;
  }
  const now = new Date();
  const member = (user, isAdmin) => ({
    memberId: user._id,
    username: user.username,
    avatar: user.avatar?.src,
    isAdmin,
    joinDate: now,
  });
  const doc = {
    _id: meteorId(),
    authorId: admin._id,
    authorUsername: admin.username,
    authorAvatar: admin.avatar?.src,
    title: g.title,
    readingMaterial: g.readingMaterial,
    description: g.description,
    imageUrl: g.imageUrl,
    capacity: 40,
    members: [
      member(admin, true),
      ...g.members.map(userBy).filter(Boolean).map((u) => member(u, false)),
    ],
    documents: [],
    peopleInvited: [],
    isPublished: true,
    isPrivate: false,
    isArchived: false,
    creationDate: now,
  };
  if (g.locationId) doc.locationId = g.locationId;
  db.groups.insertOne(doc);
  doc.members.forEach((m) =>
    db.users.updateOne(
      { _id: m.memberId, 'groups.groupId': { $ne: doc._id } },
      {
        $push: {
          groups: { groupId: doc._id, name: doc.title, isAdmin: m.isAdmin, joinDate: now },
        },
      }
    )
  );
  created += 1;
});

print(`groups: ${created} created, ${groups.length - created} already there or skipped`);
