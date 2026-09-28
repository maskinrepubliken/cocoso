// Seeds example events for autumn 2026 (28 Sep – 20 Dec) so the calendar,
// the place pages and the organizer pages have something to show.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-example-events.mongosh.js
//
// Creates four example organizers (members marked as organizers, no password,
// so nobody can log in as them) and 20 events at the seeded places: 5 recur
// weekly (one occurrence per week), the rest are one-off. A few occurrences
// get example registrations.
//
// Idempotent: organizers are matched by username and events by title, so
// running it again changes nothing. To remove everything it made:
//
//   db.activities.deleteMany({ authorName: { $in: ORGANIZER_USERNAMES } })
//   and the users/memberships of those usernames.

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
function meteorId() {
  let id = '';
  for (let i = 0; i < 17; i += 1) id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return id;
}

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const day = (s) => new Date(`${s}T00:00:00Z`);

const LAST_DAY = day('2026-12-20');

// ---- organizers ------------------------------------------------------------

const organizers = [
  {
    username: 'anna.lindqvist',
    firstName: 'Anna',
    lastName: 'Lindqvist',
    bio: '<p>Bibliotekarie i Tranemo som håller i stickcaféet och bokcirklarna.</p>',
  },
  {
    username: 'erik.johansson',
    firstName: 'Erik',
    lastName: 'Johansson',
    bio: '<p>Ledare i den lokala idrottsföreningen, med innebandy och friluftsliv.</p>',
  },
  {
    username: 'fatima.hassan',
    firstName: 'Fatima',
    lastName: 'Hassan',
    bio: '<p>Arrangerar läxhjälp, språkcafé och matlagningskvällar.</p>',
  },
  {
    username: 'lars.svensson',
    firstName: 'Lars',
    lastName: 'Svensson',
    bio: '<p>Glasblåsare i Limmared och eldsjäl i Uddebos verkstäder.</p>',
  },
];

const userIdByUsername = {};
organizers.forEach((o) => {
  let user = db.users.findOne({ username: o.username });
  if (!user) {
    const _id = meteorId();
    db.users.insertOne({
      _id,
      createdAt: new Date(),
      services: {},
      username: o.username,
      emails: [{ address: `${o.username}@example.org`, verified: false }],
      firstName: o.firstName,
      lastName: o.lastName,
      bio: o.bio,
      contactInfo: '',
      isPublic: true,
      groups: [],
      notifications: [],
    });
    user = { _id };
    print(`organizer ${o.username}: created`);
  }
  userIdByUsername[o.username] = user._id;
  db.memberships.updateOne(
    { userId: user._id },
    {
      $setOnInsert: { role: 'contributor', joinDate: new Date() },
      $set: { isPublic: true, isOrganizer: true },
    },
    { upsert: true }
  );
});

// ---- events ----------------------------------------------------------------

function occurrence(date, startTime, endTime, attendees = []) {
  return { startDate: date, startTime, endDate: date, endTime, attendees };
}

// Every 7 days from `first` up to and including LAST_DAY.
function weekly(first, startTime, endTime, skip = []) {
  const out = [];
  for (let d = day(first); d <= LAST_DAY; d = addDays(d, 7)) {
    if (!skip.includes(ymd(d))) out.push(occurrence(ymd(d), startTime, endTime));
  }
  return out;
}

function attendee(firstName, lastName, numberOfPeople = 1) {
  return {
    email: `${firstName}.${lastName}@example.org`.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o'),
    firstName,
    lastName,
    numberOfPeople,
    registerDate: new Date(),
  };
}

const events = [
  // Weekly
  {
    title: 'Stickcafé på biblioteket',
    subTitle: 'Varje tisdag – ta med ditt eget projekt',
    organizer: 'anna.lindqvist',
    place: 'Tranemo bibliotek',
    capacity: 20,
    dates: weekly('2026-09-29', '14:00', '16:00'),
    description: '<p>Vi stickar, virkar och fikar tillsammans. Nybörjare är välkomna – det finns garn och stickor att låna.</p>',
  },
  {
    title: 'Läxhjälp för högstadiet',
    subTitle: 'Varje onsdag, utom höstlovet',
    organizer: 'fatima.hassan',
    place: 'Centralen, Tranemo',
    capacity: 25,
    dates: weekly('2026-09-30', '15:30', '17:30', ['2026-11-04']),
    description: '<p>Frivilliga hjälper till med matte, svenska och engelska. Ingen anmälan behövs, men säg gärna till om du kommer.</p>',
  },
  {
    title: 'Innebandy för vuxna',
    subTitle: 'Varje torsdag – motionsnivå',
    organizer: 'erik.johansson',
    place: 'Tranemo sim- och idrottshall',
    capacity: 24,
    dates: weekly('2026-10-01', '19:00', '20:30'),
    description: '<p>Blandade lag, ingen tävling. Klubbor finns att låna. Inomhusskor krävs.</p>',
  },
  {
    title: 'Öppen glasverkstad',
    subTitle: 'Varje lördag – prova på att blåsa glas',
    organizer: 'lars.svensson',
    place: 'Glasets Hus, Limmared',
    capacity: 8,
    dates: weekly('2026-10-03', '11:00', '14:00'),
    description: '<p>Blås din egen glaskula under handledning. Begränsat antal platser per tillfälle – anmäl dig.</p>',
  },
  {
    title: 'Vävstuga i Uddebo',
    subTitle: 'Varje måndag kväll',
    organizer: 'lars.svensson',
    place: 'Väveriet, Uddebo',
    capacity: 12,
    dates: weekly('2026-10-05', '18:00', '21:00'),
    description: '<p>Vävstolarna står uppsatta. Kom och väv på egen hand eller få hjälp att komma igång.</p>',
  },

  // One-off
  {
    title: 'Höstvandring runt Tranemosjön',
    organizer: 'erik.johansson',
    place: 'Tranemosjön runt',
    capacity: 40,
    dates: [occurrence('2026-10-04', '10:00', '13:00', [attendee('Maria', 'Berg', 2), attendee('Johan', 'Ek')])],
    description: '<p>En lugn vandring på ca 9 km med fikapaus. Samling vid badplatsen.</p>',
  },
  {
    title: 'Språkcafé – prata svenska',
    organizer: 'fatima.hassan',
    place: 'Tranemo bibliotek',
    capacity: 30,
    dates: [occurrence('2026-10-08', '17:30', '19:00', [attendee('Ahmed', 'Nour'), attendee('Sara', 'Lund')])],
    description: '<p>Öva svenska i en avslappnad miljö tillsammans med andra.</p>',
  },
  {
    title: 'Bokcirkel: höstens deckare',
    organizer: 'anna.lindqvist',
    place: 'Tranemo bibliotek',
    capacity: 12,
    dates: [occurrence('2026-10-14', '18:00', '19:30')],
    description: '<p>Vi pratar om höstens nya svenska deckare. Böckerna finns att låna i förväg.</p>',
  },
  {
    title: 'Skördemarknad i hembygdsparken',
    organizer: 'anna.lindqvist',
    place: 'Tranemo hembygdspark',
    capacity: 300,
    dates: [occurrence('2026-10-10', '10:00', '15:00')],
    description: '<p>Lokala odlare, hantverkare och bagare säljer höstens skörd. Musik och servering.</p>',
  },
  {
    title: 'Skatejam i Trainspot',
    organizer: 'erik.johansson',
    place: 'Trainspot skatepark, Limmared',
    capacity: 60,
    dates: [occurrence('2026-10-17', '13:00', '17:00')],
    description: '<p>Tävlingar i olika åldersklasser, prova-på för nybörjare och grill.</p>',
  },
  {
    title: 'Matlagningskväll: syrisk mat',
    organizer: 'fatima.hassan',
    place: 'Tranehov, Tranemo',
    capacity: 16,
    dates: [occurrence('2026-10-22', '17:00', '20:00', [attendee('Karin', 'Holm', 2), attendee('Omar', 'Said'), attendee('Lena', 'Nilsson')])],
    description: '<p>Vi lagar och äter tillsammans. Råvaror ingår.</p>',
  },
  {
    title: 'Höstlovsbad i simhallen',
    organizer: 'erik.johansson',
    place: 'Tranemo sim- och idrottshall',
    capacity: 80,
    dates: [occurrence('2026-11-03', '13:00', '16:00')],
    description: '<p>Fri entré för barn under höstlovet. Flytleksaker och vattenrutschkana.</p>',
  },
  {
    title: 'Glasets historia – föreläsning',
    organizer: 'lars.svensson',
    place: 'Glasets Hus, Limmared',
    capacity: 50,
    dates: [occurrence('2026-11-07', '14:00', '15:30')],
    description: '<p>Om Limmareds glasbruk från 1740 till i dag.</p>',
  },
  {
    title: 'Curling – prova på',
    organizer: 'erik.johansson',
    place: 'Rosenlunds curlinghall, Limmared',
    capacity: 16,
    dates: [occurrence('2026-11-14', '10:00', '12:00', [attendee('Per', 'Andersson', 4)])],
    description: '<p>Instruktörer visar grunderna. Rena inomhusskor och varma kläder.</p>',
  },
  {
    title: 'Författarbesök på biblioteket',
    organizer: 'anna.lindqvist',
    place: 'Tranemo bibliotek',
    capacity: 60,
    dates: [occurrence('2026-11-18', '18:30', '20:00')],
    description: '<p>En lokal författare läser ur sin nya roman och samtalar med publiken.</p>',
  },
  {
    title: 'Textilmarknad i Väveriet',
    organizer: 'lars.svensson',
    place: 'Väveriet, Uddebo',
    capacity: 200,
    dates: [occurrence('2026-11-21', '11:00', '16:00')],
    description: '<p>Vävt, stickat och tryckt från Uddebos verkstäder.</p>',
  },
  {
    title: 'Julpyssel för barn',
    organizer: 'fatima.hassan',
    place: 'Centralen, Tranemo',
    capacity: 30,
    dates: [occurrence('2026-11-28', '10:00', '13:00', [attendee('Emma', 'Karlsson', 3), attendee('Ali', 'Rahimi', 2)])],
    description: '<p>Vi gör julkort, pappersstjärnor och pepparkakshus. Allt material finns på plats.</p>',
  },
  {
    title: 'Adventsmarknad på Forumtorget',
    organizer: 'anna.lindqvist',
    place: 'Forumtorget, Tranemo',
    capacity: 500,
    dates: [occurrence('2026-12-05', '11:00', '16:00')],
    description: '<p>Julmarknad med lokala hantverkare, glögg och tomteparad klockan 14.</p>',
  },
  {
    title: 'Luciakonsert i Glasets Hus',
    organizer: 'lars.svensson',
    place: 'Glasets Hus, Limmared',
    capacity: 120,
    dates: [occurrence('2026-12-13', '16:00', '17:00')],
    description: '<p>Limmareds kör sjunger luciasånger bland glaset.</p>',
  },
  {
    title: 'Julbord och gemenskap',
    organizer: 'fatima.hassan',
    place: 'Tranehov, Tranemo',
    capacity: 80,
    dates: [occurrence('2026-12-19', '17:00', '21:00')],
    description: '<p>Ett gemensamt julbord där alla tar med en rätt. Alla är välkomna.</p>',
  },
];

let created = 0;
events.forEach((e) => {
  if (db.activities.findOne({ title: e.title })) return;
  const resource = db.resources.findOne({ label: e.place });
  if (!resource) {
    print(`skipped "${e.title}": no resource "${e.place}"`);
    return;
  }
  const doc = {
    _id: meteorId(),
    authorId: userIdByUsername[e.organizer],
    authorName: e.organizer,
    title: e.title,
    longDescription: e.description,
    // Public events need a picture; use the place's photographs.
    images: resource.images || [],
    resource: resource.label,
    resourceId: resource._id,
    address: resource.address || '',
    capacity: e.capacity,
    datesAndTimes: e.dates,
    isExclusiveActivity: false,
    isSentForReview: false,
    isPublicActivity: true,
    isRegistrationDisabled: false,
    isRegistrationEnabled: true,
    isPublished: true,
    creationDate: new Date(),
    latestUpdate: new Date(),
  };
  if (e.subTitle) doc.subTitle = e.subTitle;
  if (resource.locationId) doc.locationId = resource.locationId;
  db.activities.insertOne(doc);
  created += 1;
});

print(`events: ${created} created, ${events.length - created} already there or skipped`);
