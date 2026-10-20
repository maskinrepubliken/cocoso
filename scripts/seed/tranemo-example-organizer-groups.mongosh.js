// Seeds example organizers that are föreningar and groups rather than
// single people, each with a photo of a group doing what the association
// does.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-example-organizer-groups.mongosh.js
//
// The associations are made up. Their pictures are freely licensed photos
// from Wikimedia Commons of other groups, linked rather than copied and
// credited in each bio. Like the other example organizers they have no
// password, so nobody can log in as them.
//
// Idempotent: organizers are matched by username. To remove them:
//   the users and memberships of the usernames below.

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
function meteorId() {
  let id = '';
  for (let i = 0; i < 17; i += 1) id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return id;
}

const THUMB = 'https://thumb.wikimedia.org/wikipedia/commons/thumb';
const credit = (artist, license) =>
  `<p><em>Foto: ${artist} (${license}, Wikimedia Commons).</em></p>`;

const organizers = [
  {
    username: 'kammarkoren',
    firstName: 'Tranemo kammarkör',
    bio: '<p>Blandad kör med ett trettiotal sångare. Vi övar på tisdagskvällar och sjunger allt från folkmusik till nyskrivet. Nya stämmor är välkomna, särskilt tenorer!</p>',
    avatar: `${THUMB}/4/4b/OsloGlobalChoir.jpg/500px-OsloGlobalChoir.jpg`,
    credit: credit('Jornskaa', 'CC BY-SA 4.0'),
  },
  {
    username: 'scoutkaren',
    firstName: 'Tranemo scoutkår',
    bio: '<p>Scouting för barn och unga från 8 år: hajk, läger, knopar och lägereld. Vi träffas varje vecka och åker på sommarläger tillsammans.</p>',
    avatar: `${THUMB}/0/09/AUT_Laxenburg_Austrian_Jubilee_Jamboree_urSPRUNG_2010_0808_10.JPG/500px-AUT_Laxenburg_Austrian_Jubilee_Jamboree_urSPRUNG_2010_0808_10.JPG`,
    credit: credit('Joadl', 'CC BY-SA 3.0'),
  },
  {
    username: 'folkdanslaget',
    firstName: 'Tranemo folkdanslag',
    bio: '<p>Vi dansar polska, schottis och vals och har spelmän som spelar till. Uppvisningar på midsommar och nybörjarkurs varje höst.</p>',
    avatar: `${THUMB}/0/05/Wikimania_closing_ceremony_performers_%2882590%29.jpg/500px-Wikimania_closing_ceremony_performers_%2882590%29.jpg`,
    credit: credit('Rhododendrites', 'CC BY-SA 4.0'),
  },
  {
    username: 'seniorklubben',
    firstName: 'Seniorklubben Tranemo',
    bio: '<p>För dig som är pensionär och vill träffa andra: boule på torsdagar, studiecirklar, utflykter och fika.</p>',
    avatar: `${THUMB}/4/44/P%C3%A9tanque_1100512_guinguette.jpg/500px-P%C3%A9tanque_1100512_guinguette.jpg`,
    credit: credit('G.Garitan', 'CC BY-SA 4.0'),
  },
  {
    username: 'limmared.fk',
    firstName: 'Limmareds fotbollsklubb',
    bio: '<p>Fotboll för flickor och pojkar från 6 år och ett damlag i division 4. Alla får vara med, oavsett nivå.</p>',
    avatar: `${THUMB}/a/a9/FK_Slavia_Orlov%C3%A1_v_MSK_Fr%C3%BDdek-M%C3%ADstek_%28girls_U-15%29_%2819_August_2020%29_02.jpg/500px-FK_Slavia_Orlov%C3%A1_v_MSK_Fr%C3%BDdek-M%C3%ADstek_%28girls_U-15%29_%2819_August_2020%29_02.jpg`,
    credit: credit('Tadeáš Bednarz', 'CC BY-SA 4.0'),
  },
  {
    username: 'uddebo.odling',
    firstName: 'Uddebo odlingslag',
    bio: '<p>Vi odlar grönsaker och blommor tillsammans på gemensamma odlingslotter, byter fröer och plantor och har skördefest i september.</p>',
    avatar: `${THUMB}/a/a2/CITY_%22FARMERS%22_CULTIVATE_THRIVING_GARDEN._VOLUNTEERS_WERE_ASSIGNED_THEIR_PLOTS_BY_COMMUNITY_ASSOCIATION._THE_SQUARE..._-_NARA_-_551621.jpg/500px-CITY_%22FARMERS%22_CULTIVATE_THRIVING_GARDEN._VOLUNTEERS_WERE_ASSIGNED_THEIR_PLOTS_BY_COMMUNITY_ASSOCIATION._THE_SQUARE..._-_NARA_-_551621.jpg`,
    credit: credit('Suzanne Szasz', 'public domain'),
  },
  {
    username: 'loparklubben',
    firstName: 'Tranemo löparklubb',
    bio: '<p>Gemensamma löprundor på måndagar och onsdagar, med grupper för både nybörjare och vana löpare. Vi springer också lopp tillsammans.</p>',
    avatar: `${THUMB}/7/7d/Large_group_running_girls.JPG/500px-Large_group_running_girls.JPG`,
    credit: credit('Peter van der Sluijs', 'CC BY-SA 3.0'),
  },
  {
    username: 'ungdomsgarden',
    firstName: 'Ungdomsgården Tranemo',
    bio: '<p>En mötesplats för dig mellan 13 och 19 år: spel, musik, läxhjälp och resor. Unga är med och bestämmer vad vi gör.</p>',
    avatar: `${THUMB}/f/fd/WAP_Volunteers_group_photo.jpg/500px-WAP_Volunteers_group_photo.jpg`,
    credit: credit('Kunokuno', 'CC BY-SA 4.0'),
  },
];

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
      lastName: '',
      bio: o.bio + o.credit,
      contactInfo: '',
      isPublic: true,
      groups: [],
      notifications: [],
      avatar: { src: o.avatar, date: new Date() },
    });
    user = { _id };
    print(`organizer ${o.username}: created`);
  }
  // A public address for the organizer page. It is on example.org, so
  // nothing sent to it reaches a real inbox.
  db.users.updateOne(
    { _id: user._id, 'publicContact.email': { $exists: false } },
    { $set: { 'publicContact.email': `${o.username}@example.org` } }
  );
  db.memberships.updateOne(
    { userId: user._id },
    {
      $setOnInsert: { role: 'contributor', joinDate: new Date() },
      $set: { isPublic: true, isOrganizer: true },
    },
    { upsert: true }
  );
});
