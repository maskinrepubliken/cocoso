// Adds photographs to the Tranemo resources that have one.
//
// Run against the Docker stack:
//   mongosh --quiet "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-resource-images.mongosh.js
//
// Every photo here depicts the actual place, is hosted on Wikimedia Commons and
// is either public domain or CC BY-SA. The `images` field takes plain URLs —
// imageHelper passes external http(s) URLs through untouched — so the files are
// linked rather than copied into the app's own media storage.
//
// CC BY-SA requires crediting the photographer wherever the image is shown, and
// a resource has nowhere to put a caption, so the credit is appended to the
// description instead. Re-running is safe: a credit is only appended once.
//
// Resources with no photograph of that specific place on Commons — the school
// sports halls, the football pitches and most of the badplatser — are left
// without an image on purpose.

const HOST = 'tranemo.skaru.se';
const THUMB = 'https://thumb.wikimedia.org/wikipedia/commons/thumb';

const photos = [
  {
    _id: '2MAK2auNt5NMHSpyt',
    label: 'Centralen, Tranemo',
    url: `${THUMB}/5/51/Centralen%2C_Tranemo_-_20250616_-_01.jpg/1280px-Centralen%2C_Tranemo_-_20250616_-_01.jpg`,
    credit: 'Foto: AleWi (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    // The library is inside Centralen — the sign on the facade reads BIBLIOTEK.
    _id: 'eyeNzk8Nan9qRSGn2',
    label: 'Tranemo bibliotek',
    url: `${THUMB}/5/51/Centralen%2C_Tranemo_-_20250616_-_01.jpg/1280px-Centralen%2C_Tranemo_-_20250616_-_01.jpg`,
    credit: 'Foto: AleWi (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    _id: 'HWHmmaSvTSTjn5Q5q',
    label: 'Glasets Hus, Limmared',
    url: `${THUMB}/7/72/Glasets_Hus.jpg/1280px-Glasets_Hus.jpg`,
    credit: 'Foto: Hansnerstu (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    _id: 'CQMMdTbbS8tCn6CJF',
    label: 'Torpa stenhus, Länghem',
    url: `${THUMB}/c/ca/Torpa_stenhuset.JPG/1280px-Torpa_stenhuset.JPG`,
    credit: 'Foto: Artifex (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    _id: 'Wm4dPShcSEog2Xbwb',
    label: 'Hofsnäs herrgård, Länghem',
    url: `${THUMB}/5/5a/Hofsnasherrgard.JPG/1280px-Hofsnasherrgard.JPG`,
    credit: 'Foto: Pimvantend (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    // The footbridge over the outlet, on the loop itself.
    _id: 'NW9Sd6JYk9aHft7Zu',
    label: 'Tranemosjön runt',
    url: `${THUMB}/5/52/Tranemosj%C3%B6n_120731.jpg/1280px-Tranemosj%C3%B6n_120731.jpg`,
    credit: 'Foto: Ulkl (public domain, Wikimedia Commons).',
  },
  {
    _id: 'cMxJnFPwDSGryQDdc',
    label: 'Badplatsen Tranemosjön',
    url: `${THUMB}/9/9c/Tranemosj%C3%B6n_-_20250616_-_08.jpg/1280px-Tranemosj%C3%B6n_-_20250616_-_08.jpg`,
    credit: 'Foto: AleWi (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    _id: 'xSB86Y4nTG4sgKkLM',
    label: 'Badplatsen Stomsjön, Ljungsarp',
    url: `${THUMB}/6/60/Stomsj%C3%B6n_ljungsarp_120731.jpg/1280px-Stomsj%C3%B6n_ljungsarp_120731.jpg`,
    credit: 'Foto: Ulkl (public domain, Wikimedia Commons).',
  },
];

let updated = 0;

for (const photo of photos) {
  const resource = db.resources.findOne({ _id: photo._id, host: HOST });

  if (!resource) {
    print(`SKIP  ${photo.label} — no such resource on ${HOST}`);
    continue;
  }
  if (resource.label !== photo.label) {
    print(`SKIP  ${photo._id} — label is "${resource.label}", expected "${photo.label}"`);
    continue;
  }

  const description = resource.description || '';
  const set = { images: [photo.url] };

  if (!description.includes(photo.credit)) {
    set.description = description ? `${description} ${photo.credit}` : photo.credit;
  }

  db.resources.updateOne({ _id: photo._id, host: HOST }, { $set: set });
  updated += 1;
  print(`OK    ${photo.label}`);
}

print(`\n${updated} of ${photos.length} resources updated.`);
