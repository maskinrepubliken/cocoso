// Seeds Äta/handla/bo: ten cafés, restaurants, shops and inns in Tranemo
// kommun with opening hours and menus, and the menu entry for the section.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-example-businesses.mongosh.js
//
// The businesses are real, but the hours, menus and prices here are made up:
// every one is marked isExample, and its page says so. No street address or
// phone number is given, so nobody is sent to a wrong door or number; the
// card shows the ort only. The pictures are freely licensed photos from
// Wikimedia Commons, linked and credited in the description; most show
// another place of the same kind and say so.
//
// Idempotent: businesses are matched by name and updated in place, so
// running it again refreshes hours, menus and pictures.

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
function meteorId() {
  let id = '';
  for (let i = 0; i < 17; i += 1) id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return id;
}

const location = (slug) => db.locations.findOne({ slug })?._id;

// Opening hours: [days, opens, closes] with days as 1 (Monday) to 7 (Sunday).
const hours = (...rows) =>
  rows.flatMap(([days, opens, closes]) => days.map((day) => ({ day, opens, closes })));
const WEEKDAYS = [1, 2, 3, 4, 5];

const credit = (photo) =>
  `<p><em>${photo.depicts === 'actual' ? '' : 'Exempelbild, inte från stället. '}Foto: ${photo.artist} (${photo.license}, Wikimedia Commons).</em></p>`;

const THUMB = 'https://thumb.wikimedia.org/wikipedia/commons/thumb';

// One photo each; only Hofsnäs shows the real place.
const PHOTOS = {
  sportia: {
    url: `${THUMB}/6/6d/Interior_sports_clothing_store_Cala_Millor.jpg/1280px-Interior_sports_clothing_store_Cala_Millor.jpg`,
    artist: 'Steffen Mokosch',
    license: 'CC BY-SA 4.0',
    depicts: 'illustrative',
  },
  brot: {
    url: `${THUMB}/8/82/Artisan_Loaves_of_Bread_%28Unsplash%29.jpg/1280px-Artisan_Loaves_of_Bread_%28Unsplash%29.jpg`,
    artist: 'Drew Coffman',
    license: 'CC0',
    depicts: 'illustrative',
  },
  smabruket: {
    url: `${THUMB}/f/fd/Skillebyholm%2C_g%C3%A5rdsbutik%2C_2017.jpg/1280px-Skillebyholm%2C_g%C3%A5rdsbutik%2C_2017.jpg`,
    artist: 'Holger.Ellgaard',
    license: 'CC BY-SA 4.0',
    depicts: 'illustrative',
  },
  aterbruk: {
    url: `${THUMB}/4/42/Clothing_for_sale_in_the_Reuse_Centre_%28Kierr%C3%A4tyskeskus%29_store_in_Kyl%C3%A4saari%2C_Helsinki%2C_2020.jpg/1280px-Clothing_for_sale_in_the_Reuse_Centre_%28Kierr%C3%A4tyskeskus%29_store_in_Kyl%C3%A4saari%2C_Helsinki%2C_2020.jpg`,
    artist: 'Eweis Yehia',
    license: 'CC BY-SA 4.0',
    depicts: 'illustrative',
  },
  sibbarps: {
    url: `${THUMB}/8/8c/Barn_on_R%C3%B6e_g%C3%A5rd.jpg/1280px-Barn_on_R%C3%B6e_g%C3%A5rd.jpg`,
    artist: 'W.carter',
    license: 'CC0',
    depicts: 'illustrative',
  },
  vardshuset: {
    url: `${THUMB}/9/9c/%C3%96sterv%C3%A5la_g%C3%A4stgivarg%C3%A5rd_2012c.JPG/1280px-%C3%96sterv%C3%A5la_g%C3%A4stgivarg%C3%A5rd_2012c.JPG`,
    artist: 'Jssfrk',
    license: 'CC BY-SA 3.0',
    depicts: 'illustrative',
  },
  hofsnas: {
    url: `${THUMB}/5/5a/Hofsnasherrgard.JPG/1280px-Hofsnasherrgard.JPG`,
    artist: 'Pimvantend',
    license: 'CC BY-SA 4.0',
    depicts: 'actual',
  },
  stella: {
    url: `${THUMB}/5/5e/Wood_Oven_Pizza.jpg/1280px-Wood_Oven_Pizza.jpg`,
    artist: 'Oakwood Fire Pizza',
    license: 'CC BY-SA 4.0',
    depicts: 'illustrative',
  },
  motesplatsen: {
    url: `${THUMB}/a/a8/Pastries_and_coffee_20260708_-_01.jpg/1280px-Pastries_and_coffee_20260708_-_01.jpg`,
    artist: 'Wiki Asmah',
    license: 'CC BY-SA 4.0',
    depicts: 'illustrative',
  },
  thaisilk: {
    url: `${THUMB}/e/e5/Thai_green_chicken_curry_and_roti.jpg/1280px-Thai_green_chicken_curry_and_roti.jpg`,
    artist: 'Takeaway',
    license: 'CC BY-SA 3.0',
    depicts: 'illustrative',
  },
};

const businesses = [
  {
    key: 'sportia',
    label: 'Team Sportia Tranemo',
    kinds: ['shop'],
    locationId: location('tranemo'),
    tagline: 'Sport, fritid och friluftsliv',
    description:
      '<p>Kläder, skor och utrustning för idrott och friluftsliv, och service som skidslipning och skridskoslipning.</p>',
    openingHours: hours([WEEKDAYS, '10:00', '18:00'], [[6], '10:00', '14:00']),
    hoursNote: 'Söndagar stängt.',
    menu: [
      {
        title: 'Löpning och träning',
        items: [
          { name: 'Löparskor', price: 'från 899 kr' },
          { name: 'Träningströja', price: 'från 299 kr' },
          { name: 'Pannlampa', price: '349 kr' },
        ],
      },
      {
        title: 'Vinter',
        items: [
          { name: 'Längdskidor, paket', description: 'Skidor, bindning och stavar', price: 'från 2 495 kr' },
          { name: 'Skridskor', price: 'från 699 kr' },
        ],
      },
      {
        title: 'Service',
        items: [
          { name: 'Skidslipning', price: '249 kr' },
          { name: 'Skridskoslipning', price: '80 kr' },
          { name: 'Racketsträngning', price: '199 kr' },
        ],
      },
    ],
  },
  {
    key: 'brot',
    label: 'Bröt',
    kinds: ['eat', 'shop'],
    locationId: location('uddebo'),
    tagline: 'Surdegsbageri och kafé',
    description:
      '<p>Bröd bakat på surdeg och stenmalet mjöl, bullar och lunch på helgerna. Kom tidigt, det tar slut!</p>',
    openingHours: hours([[4, 5], '10:00', '17:00'], [[6, 7], '09:00', '15:00']),
    menu: [
      {
        title: 'Bröd',
        items: [
          { name: 'Lantbröd', description: 'Vete och dinkel, lång jäsning', price: '65 kr' },
          { name: 'Rågbröd', description: 'Med solros och linfrö', price: '70 kr' },
          { name: 'Baguette', price: '35 kr' },
        ],
      },
      {
        title: 'Fika',
        items: [
          { name: 'Kardemummabulle', price: '35 kr' },
          { name: 'Kanelbulle', price: '32 kr' },
          { name: 'Kaffe', description: 'Påtår ingår', price: '30 kr' },
        ],
      },
      {
        title: 'Lunch (lör–sön)',
        items: [
          { name: 'Dagens soppa med bröd', price: '110 kr' },
          { name: 'Surdegsmacka', description: 'Ost, picklad lök och örter', price: '85 kr' },
        ],
      },
    ],
  },
  {
    key: 'smabruket',
    label: 'Småbruket',
    kinds: ['eat', 'shop'],
    locationId: location('uddebo'),
    tagline: 'Gårdskafé och gårdsbutik',
    description:
      '<p>Ett litet jordbruk med grönsaker, ägg och honung i butiken, och våfflor och kaffe i kaféet när solen skiner.</p>',
    openingHours: hours([[5], '11:00', '17:00'], [[6, 7], '11:00', '16:00']),
    hoursNote: 'Kaféet är öppet maj–september. Butiken har öppet året runt.',
    menu: [
      {
        title: 'Gårdsbutik',
        items: [
          { name: 'Ägg, sex stycken', price: '45 kr' },
          { name: 'Honung', description: 'Från gårdens egna bin, 450 g', price: '90 kr' },
          { name: 'Säsongens grönsaker', price: 'dagspris' },
        ],
      },
      {
        title: 'Kafé',
        items: [
          { name: 'Våffla med sylt och grädde', price: '60 kr' },
          { name: 'Kaffe', price: '30 kr' },
          { name: 'Rabarberlemonad', price: '35 kr' },
        ],
      },
    ],
  },
  {
    key: 'aterbruk',
    label: 'Återbruk',
    kinds: ['shop'],
    locationId: location('tranemo'),
    tagline: 'Second hand och återbruk',
    description:
      '<p>Möbler, kläder, böcker och husgeråd som får ett nytt liv. Lämna in det du inte behöver, eller hitta något du behöver.</p>',
    openingHours: hours([[2, 3, 4, 5], '11:00', '17:00'], [[6], '10:00', '14:00']),
    hoursNote: 'Inlämning tisdagar och torsdagar.',
    menu: [
      {
        title: 'Sortiment',
        items: [
          { name: 'Möbler', price: 'från 100 kr' },
          { name: 'Barnkläder', price: '10–50 kr' },
          { name: 'Böcker', price: '10 kr' },
          { name: 'Porslin och glas', price: 'från 5 kr' },
        ],
      },
    ],
  },
  {
    key: 'sibbarps',
    label: 'Sibbarps',
    kinds: ['shop'],
    tagline: 'Gårdsbutik med kött och ägg från gården',
    description:
      '<p>Kött från djur som betat på gårdens marker, ägg och korv. Beställ gärna köttlåda i förväg.</p>',
    openingHours: hours([[5], '13:00', '18:00'], [[6], '10:00', '14:00']),
    menu: [
      {
        title: 'Från gården',
        items: [
          { name: 'Köttfärs, nöt', description: 'Ett kilo', price: '149 kr' },
          { name: 'Entrecôte', price: '499 kr/kg' },
          { name: 'Grillkorv', price: '79 kr' },
          { name: 'Ägg, sex stycken', price: '40 kr' },
          { name: 'Köttlåda, 10 kg', description: 'Beställs i förväg', price: '1 690 kr' },
        ],
      },
    ],
  },
  {
    key: 'vardshuset',
    label: 'Värdshuset Ambjörnarp',
    kinds: ['eat', 'stay'],
    tagline: 'Värdshus med husmanskost och rum',
    description:
      '<p>Husmanskost och dagens lunch i ett gammalt värdshus i Ambjörnarp, och några rum för den som vill stanna över natten.</p>',
    openingHours: hours(
      [[3, 4, 5], '11:00', '14:00'],
      [[3, 4, 5], '17:00', '21:00'],
      [[6], '12:00', '21:00'],
      [[7], '12:00', '17:00']
    ),
    menu: [
      {
        title: 'Lunch',
        items: [{ name: 'Dagens lunch', description: 'Med sallad, bröd och kaffe', price: '125 kr' }],
      },
      {
        title: 'Husmanskost',
        items: [
          { name: 'Köttbullar', description: 'Potatismos, gräddsås och lingon', price: '165 kr' },
          { name: 'Pannbiff med lök', price: '175 kr' },
          { name: 'Stekt strömming', description: 'Med potatismos och skirat smör', price: '155 kr' },
        ],
      },
      {
        title: 'Rum',
        items: [
          { name: 'Enkelrum', description: 'Med frukost', price: '795 kr/natt' },
          { name: 'Dubbelrum', description: 'Med frukost', price: '1 095 kr/natt' },
        ],
      },
    ],
  },
  {
    key: 'hofsnas',
    label: 'Hofsnäs herrgård',
    kinds: ['eat', 'stay'],
    locationId: location('langhem'),
    tagline: 'Herrgård med kafé, restaurang och hotell vid Torpasjön',
    description:
      '<p>Kafé i herrgårdens salonger, middag på helgerna och rum för en natt eller en hel vecka vid sjön.</p>',
    openingHours: hours([[1, 2, 3, 4, 5, 6, 7], '11:00', '16:00'], [[5, 6], '17:00', '22:00']),
    hoursNote: 'Middag fredag och lördag, bord bokas i förväg.',
    menu: [
      {
        title: 'Kafé',
        items: [
          { name: 'Räksmörgås', price: '175 kr' },
          { name: 'Kaffe och hembakt kaka', price: '65 kr' },
          { name: 'Herrgårdens äppelkaka', description: 'Med vaniljsås', price: '75 kr' },
        ],
      },
      {
        title: 'Middag',
        items: [
          { name: 'Tre rätter', description: 'Säsongens råvaror från trakten', price: '595 kr' },
          { name: 'Vinpaket', price: '395 kr' },
        ],
      },
      {
        title: 'Rum',
        items: [
          { name: 'Dubbelrum', description: 'Med frukost', price: '1 495 kr/natt' },
          { name: 'Sjöutsikt', description: 'Med frukost', price: '1 795 kr/natt' },
        ],
      },
    ],
  },
  {
    key: 'stella',
    label: 'Stella pizzeria',
    kinds: ['eat'],
    locationId: location('tranemo'),
    tagline: 'Pizzeria och grill',
    description: '<p>Pizza, sallader och grill. Ät här eller hämta, ring gärna i förväg.</p>',
    openingHours: hours([[1, 2, 3, 4], '11:00', '21:00'], [[5, 6], '11:00', '22:00'], [[7], '12:00', '21:00']),
    menu: [
      {
        title: 'Pizzor',
        items: [
          { name: 'Margherita', description: 'Tomatsås och ost', price: '105 kr' },
          { name: 'Vesuvio', description: 'Skinka', price: '110 kr' },
          { name: 'Capricciosa', description: 'Skinka och champinjoner', price: '115 kr' },
          { name: 'Hawaii', description: 'Skinka och ananas', price: '115 kr' },
          { name: 'Kebabpizza', description: 'Kebabkött, lök och kebabsås', price: '130 kr' },
        ],
      },
      {
        title: 'Sallader och grill',
        items: [
          { name: 'Kycklingsallad', price: '120 kr' },
          { name: 'Hamburgertallrik', description: 'Med pommes frites', price: '125 kr' },
        ],
      },
    ],
  },
  {
    key: 'motesplatsen',
    label: 'Mötesplatsen',
    kinds: ['eat'],
    locationId: location('limmared'),
    tagline: 'Kafé och mötesplats för alla',
    description:
      '<p>Ett kafé där alla är välkomna, med fika, enkel lunch och plats att sitta ner och prata en stund.</p>',
    openingHours: hours([WEEKDAYS, '09:00', '16:00'], [[6], '10:00', '14:00']),
    menu: [
      {
        title: 'Kafé',
        items: [
          { name: 'Kaffe eller te', price: '25 kr' },
          { name: 'Smörgås', description: 'Ost eller skinka', price: '45 kr' },
          { name: 'Bulle', price: '25 kr' },
          { name: 'Dagens soppa', description: 'Med bröd, vardagar', price: '85 kr' },
        ],
      },
    ],
  },
  {
    key: 'thaisilk',
    label: 'Thai Silk',
    kinds: ['eat'],
    locationId: location('tranemo'),
    tagline: 'Thailändsk restaurang',
    description:
      '<p>Thailändsk mat från wok och gryta, lunch på vardagar och avhämtning hela dagen.</p>',
    openingHours: hours([WEEKDAYS, '11:00', '14:00'], [WEEKDAYS, '16:00', '21:00'], [[6, 7], '13:00', '21:00']),
    menu: [
      {
        title: 'Förrätter',
        items: [
          { name: 'Vårrullar', description: 'Med sötsur chilisås', price: '65 kr' },
          { name: 'Tom kha gai', description: 'Kokosmjölkssoppa med kyckling', price: '85 kr' },
        ],
      },
      {
        title: 'Varmrätter',
        items: [
          { name: 'Pad thai', description: 'Risnudlar med räkor eller kyckling', price: '145 kr' },
          { name: 'Gaeng keow wan', description: 'Grön curry med kyckling', price: '145 kr' },
          { name: 'Panaeng', description: 'Röd curry med nötkött', price: '149 kr' },
          { name: 'Pad krapow', description: 'Wokad fläskfärs med basilika och ägg', price: '139 kr' },
        ],
      },
      {
        title: 'Lunch (vardagar)',
        items: [{ name: 'Dagens rätt', description: 'Med sallad och dricka', price: '115 kr' }],
      },
    ],
  },
];

let created = 0;
let updated = 0;
businesses.forEach((b) => {
  const photo = PHOTOS[b.key];
  const doc = {
    label: b.label,
    kinds: b.kinds,
    tagline: b.tagline,
    description: b.description + (photo ? credit(photo) : ''),
    images: photo ? [photo.url] : [],
    openingHours: b.openingHours,
    hoursNote: b.hoursNote,
    menu: b.menu,
    isExample: true,
    updatedAt: new Date(),
  };
  if (b.locationId) {
    doc.locationId = b.locationId;
  }
  Object.keys(doc).forEach((field) => doc[field] === undefined && delete doc[field]);

  const existing = db.businesses.findOne({ label: b.label });
  if (existing) {
    db.businesses.updateOne({ _id: existing._id }, { $set: doc });
    updated += 1;
  } else {
    db.businesses.insertOne({ _id: meteorId(), createdAt: new Date(), ...doc });
    created += 1;
  }
});

// The section in the menu, after Platser.
const site = db.site.findOne();
if (site && !site.settings.menu.some((item) => item.name === 'businesses')) {
  const menu = site.settings.menu.slice();
  const after = menu.findIndex((item) => item.name === 'resources');
  menu.splice(after + 1, 0, {
    label: 'Äta/handla/bo',
    name: 'businesses',
    description: 'Kaféer, restauranger, butiker och ställen att bo på i hela kommunen.',
    isVisible: true,
    isHomePage: false,
    isComposablePage: false,
  });
  db.site.updateOne({ _id: site._id }, { $set: { 'settings.menu': menu } });
  print('menu: added Äta/handla/bo');
}

print(`businesses: ${created} created, ${updated} updated`);
