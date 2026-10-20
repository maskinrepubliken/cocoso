// Gives every förening and place that has no picture yet a photo from
// Wikimedia Commons.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-place-and-group-images.mongosh.js
//
// Commons has photos of very few of these exact places, so most pictures
// are of another place of the same kind (a sports hall, a bygdegård, a
// lake beach). Their caption starts "Exempelbild, inte från platsen" so
// nobody takes them for the real place. The lakes that do show the right
// lake say what they show. All are public domain, CC0, CC BY or CC BY-SA,
// linked rather than copied, and credited at the end of the description.
//
// Idempotent: an entry that already has a picture is left alone, and a
// credit is only added once.

const THUMB = 'https://thumb.wikimedia.org/wikipedia/commons/thumb';

const photos = [
  {
    collection: 'resources',
    _id: 'EWWrqcDSDhvvZqXPN',
    label: 'Väveriet, Uddebo',
    url: `${THUMB}/7/78/Haslach_an_der_M%C3%BChl_-_Textiles_Zentrum_Haslach_-_30_-_verschiedene_Handwebst%C3%BChle.jpg/1280px-Haslach_an_der_M%C3%BChl_-_Textiles_Zentrum_Haslach_-_30_-_verschiedene_Handwebst%C3%BChle.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Haeferl (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 's57dspkToQ4LrKiYQ',
    label: 'Tranemo hembygdspark',
    url: `${THUMB}/0/07/%C3%85rdala_hembygdsg%C3%A5rd_2006.jpg/1280px-%C3%85rdala_hembygdsg%C3%A5rd_2006.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Jenforne (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'pBBzwgf7cfk6xm2iX',
    label: 'Forumtorget, Tranemo',
    url: `${THUMB}/3/3d/Tranemo_kommunshus%2C_Schack_-_20250616_-_07.jpg/1280px-Tranemo_kommunshus%2C_Schack_-_20250616_-_07.jpg`,
    credit: 'Bilden visar torget vid Tranemo kommunhus. Foto: AleWi (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'shmmCREnCQBQe8tAx',
    label: 'Tranemo sim- och idrottshall',
    url: `${THUMB}/7/76/V%C3%A4stertorpshallen_stora_simhallen_SSM_10024249.jpg/1280px-V%C3%A4stertorpshallen_stora_simhallen_SSM_10024249.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Mattias Ek (CC BY 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'eycvj3MmzCnn7Kebb',
    label: 'Dalstorpskolans idrottshall',
    url: `${THUMB}/b/bb/Torsviks_idrottshall%2C_2022c.jpg/1280px-Torsviks_idrottshall%2C_2022c.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Holger.Ellgaard (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'LcfNtsPexTW5zrHTJ',
    label: 'Grimsåsskolans idrottshall',
    url: `${THUMB}/6/6c/Konradsbergs_idrottshall%2C_2018d.jpg/1280px-Konradsbergs_idrottshall%2C_2018d.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Holger.Ellgaard (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'hyK5yQBBxMt4r3FZL',
    label: 'Limmaredsskolans idrottshall',
    url: `${THUMB}/2/2b/Kleine_Sporthalle_%28Innenansicht%29_der_Freien_Waldorfschule_Hannover-Maschsee.jpg/1280px-Kleine_Sporthalle_%28Innenansicht%29_der_Freien_Waldorfschule_Hannover-Maschsee.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Kilianarning (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'KZDGby4zduXHEGkPR',
    label: 'Länghemsskolans idrottshall',
    url: `${THUMB}/2/2b/Neue_Sporthalle_%28Innenansicht%29_der_Freien_Waldorfschule_Hannover-Maschsee.jpg/1280px-Neue_Sporthalle_%28Innenansicht%29_der_Freien_Waldorfschule_Hannover-Maschsee.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Kilianarning (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'bqTyEzmP4q5kqh6iL',
    label: 'Ambjörnarpshallen',
    url: `${THUMB}/b/be/Sports_Hall%2C_interior%2C_2020_G%C3%B6d.jpg/1280px-Sports_Hall%2C_interior%2C_2020_G%C3%B6d.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Globetrotter19 (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'fPtBighzJhoBLvMNM',
    label: 'Sjötoftahallen',
    url: `${THUMB}/2/26/Hans-Kern-Sporthalle_%28Reutlingen%29_Innen_1.jpg/1280px-Hans-Kern-Sporthalle_%28Reutlingen%29_Innen_1.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Windharp (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'jh7qxFbgxQvoxeh6h',
    label: 'Gymnastiksalen, Ljungsarp',
    url: `${THUMB}/5/52/Turnhalle_F%C3%BCnfzehnerstra%C3%9Fe_18_2014_innen_1.jpg/1280px-Turnhalle_F%C3%BCnfzehnerstra%C3%9Fe_18_2014_innen_1.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Andy_king50 (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'iDXHRisZnPWvyZQhm',
    label: 'Lindstorp, Ölsremma',
    url: `${THUMB}/6/62/Bygdegard_Granhammar_Kungsor.JPG/1280px-Bygdegard_Granhammar_Kungsor.JPG`,
    credit: 'Exempelbild, inte från platsen. Foto: Udo Schröter (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'rEwxskwEGjfmAkKwf',
    label: 'Nittorps ishall',
    url: `${THUMB}/4/44/Kuparivuori_indoor_ice_rink.jpg/1280px-Kuparivuori_indoor_ice_rink.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Kotivalo (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'JjJL2CQkZuggnmuk7',
    label: 'Grimsås bassäng',
    url: `${THUMB}/6/69/Trelleborgs_badhus%2C_Gamla_bass%C3%A4ngen.jpg/1280px-Trelleborgs_badhus%2C_Gamla_bass%C3%A4ngen.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Oliver Lazarevski (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'vhYGXfCaXoGkNjpjq',
    label: 'Tranehov, Tranemo',
    url: `${THUMB}/0/03/Ulriksberg_Bygdeg%C3%A5rden_2014.jpg/1280px-Ulriksberg_Bygdeg%C3%A5rden_2014.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Holger.Ellgaard (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'ttEcWuMWJZ7mygXue',
    label: 'Dalshov, Dalstorp',
    url: `${THUMB}/8/83/L%C3%A5sb%C3%B6le_ordenshus.jpg/1280px-L%C3%A5sb%C3%B6le_ordenshus.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Andreaze (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'EQTmruF3A5jnuaXEX',
    label: 'Ekelid, Ambjörnarp',
    url: `${THUMB}/e/e4/Tavn%C3%A4s_f%C3%B6reningshus_01.jpg/1280px-Tavn%C3%A4s_f%C3%B6reningshus_01.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Hans Lindqvist (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'pPZNxhT53qMwtTSN8',
    label: 'Grimsborg, Grimsås',
    url: `${THUMB}/b/be/Rodasel-bygdegarden-juli2013.jpg/1280px-Rodasel-bygdegarden-juli2013.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Nisann (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: '5RbLwXjf9pfStykvj',
    label: 'Glasvallen, Limmared',
    url: `${THUMB}/9/95/Bollebygd%2C_Bj%C3%B6rnskogsvallen%2C_20230521%2C_12.jpg/1280px-Bollebygd%2C_Bj%C3%B6rnskogsvallen%2C_20230521%2C_12.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: AleWi (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'mwazfKFmxYYjme5yW',
    label: 'Vallskoga, Ljungsarp',
    url: `${THUMB}/1/19/Ingvallsbennings_idrottsplats.jpg/1280px-Ingvallsbennings_idrottsplats.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Calle Eklund/V-wolf (CC BY 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: '3B9LKvLeQtjFiwuNc',
    label: 'Ingsvallen, Länghem',
    url: `${THUMB}/f/fb/Campo_do_Dalhem_IF_01.jpg/1280px-Campo_do_Dalhem_IF_01.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Bene Riobó (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'xyDZE48jGkgpF3GXr',
    label: 'Idrottsparken, Månstad',
    url: `${THUMB}/a/a9/Klostervallen.jpg/1280px-Klostervallen.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Green Yoshi (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'aMFhWwYhNEKKPDCXM',
    label: 'Åsavallen, Nittorp',
    url: `${THUMB}/b/b2/H%C3%A4llbybrynn%2C_Skogsvallen.JPG/1280px-H%C3%A4llbybrynn%2C_Skogsvallen.JPG`,
    credit: 'Exempelbild, inte från platsen. Foto: Hangsna (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'M3EnJtk2nDfLQF9QL',
    label: 'Sjövalla, Sjötofta',
    url: `${THUMB}/8/84/G%C3%B6tavallen.JPG/1280px-G%C3%B6tavallen.JPG`,
    credit: 'Exempelbild, inte från platsen. Foto: Mikael Ejdemyr (CC0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'Ejkg5JADkwdBY4vWY',
    label: 'Rosenlunds curlinghall, Limmared',
    url: `${THUMB}/1/1d/Curling_%C5%81%C3%B3d%C5%BA_ice_rink_-_inside.jpg/1280px-Curling_%C5%81%C3%B3d%C5%BA_ice_rink_-_inside.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Katafrakt (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'RkAW4ktpHREAEujiC',
    label: 'Trainspot skatepark, Limmared',
    url: `${THUMB}/d/d3/Part_of_ramp_at_Brastad_SK8%2C_the_new_skatepark_in_Lysekil_Municipality.jpg/1280px-Part_of_ramp_at_Brastad_SK8%2C_the_new_skatepark_in_Lysekil_Municipality.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: W.carter (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'FYDP9AgoyMGKP2RjL',
    label: 'Hagatorpets friluftsgård, Tranemo',
    url: `${THUMB}/7/71/Domaruddens_friluftsg%C3%A5rd.jpg/1280px-Domaruddens_friluftsg%C3%A5rd.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Udo Schröter (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'eAHhaXHdjtNqJdDpL',
    label: 'Grimsås fritidsstuga',
    url: `${THUMB}/3/3a/Stora_Holmevattnet_Raststuga_01.jpg/1280px-Stora_Holmevattnet_Raststuga_01.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Erik Andreasson (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'hDQu7hSnqXZPd3Ckp',
    label: 'Kroksjöns fiskecamp, Tranemo',
    url: `${THUMB}/1/14/Livarebosj%C3%B6n_Raststuga_-_setting.jpg/1280px-Livarebosj%C3%B6n_Raststuga_-_setting.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Erik Andreasson (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: '3GnXjEGnCkXXZDj9E',
    label: 'Badplatsen Visen, Ambjörnarp',
    url: `${THUMB}/5/58/Badplats_Lemundtj%C3%A4rn_%2857181%29.jpg/1280px-Badplats_Lemundtj%C3%A4rn_%2857181%29.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: So9q (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'ALZKKvpnNsPLxLvp4',
    label: 'Badplatsen Dalstorpasjön',
    url: `${THUMB}/e/e1/Dalstorp_bron.jpg/1280px-Dalstorp_bron.jpg`,
    credit: 'Bilden visar Dalstorpasjön från bron i Dalstorp. Foto: Ogrendel02 (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: '9dc9e6Con9vyK7ZLd',
    label: 'Badplatsen Grytteredssjön, Hulared',
    url: `${THUMB}/3/38/Estabosj%C3%B6ns_badplats.jpg/1280px-Estabosj%C3%B6ns_badplats.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Sjunnesson (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'QYmeNZrmtxCuuGKY4',
    label: 'Badplatsen Ösjön, Limmared',
    url: `${THUMB}/7/70/Stengardshultsj%C3%B6n_Badplats-20140723-RM-080233.jpg/1280px-Stengardshultsj%C3%B6n_Badplats-20140723-RM-080233.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Ermell (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'xK6q4TkFjq4fNoEto',
    label: 'Badplatsen Lagmanshagasjön, Ljungsarp',
    url: `${THUMB}/9/95/Fageredssjon_swimming_area_Vastergotland_Sweden_6Sep2022.jpg/1280px-Fageredssjon_swimming_area_Vastergotland_Sweden_6Sep2022.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: R. Henrik Nilsson (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'tK8Hg5s6sRDAKzkRi',
    label: 'Badplatsen Sävsjön, Länghem',
    url: `${THUMB}/4/4c/K%C3%A4yr%C3%A4lammen_uimaranta.jpg/1280px-K%C3%A4yr%C3%A4lammen_uimaranta.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Kayralampi (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'F2HXpXNYgbXv6rjFk',
    label: 'Badplatsen Torpasjön, Hofsnäs',
    url: `${THUMB}/9/9e/Torpasj%C3%B6n.jpg/1280px-Torpasj%C3%B6n.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: L.elizao63 (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: '6NxQv9SnoS7qCEK3N',
    label: 'Badplatsen Marjebosjön, Mossebo',
    url: `${THUMB}/d/d1/L%C3%A5ngsj%C3%B6badet_oktober_2017.jpg/1280px-L%C3%A5ngsj%C3%B6badet_oktober_2017.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Matsskoglund (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'nfkDShRoP3j7gr4pS',
    label: 'Badplatsen Sämsjön, Månstad',
    url: `${THUMB}/0/0f/Public_beach_S%C3%A4msj%C3%B6n_Vegby.jpg/1280px-Public_beach_S%C3%A4msj%C3%B6n_Vegby.jpg`,
    credit: 'Bilden visar Sämsjön vid Vegby. Foto: Pjotr\'k (CC BY-SA 3.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'zMsBLB8ZN73dBdXKy',
    label: 'Badplatsen Nygårdssjön, Nittorp',
    url: `${THUMB}/c/c9/Beach_Evedal_Helgasj%C3%B6n_V%C3%A4xj%C3%B6_1.jpg/1280px-Beach_Evedal_Helgasj%C3%B6n_V%C3%A4xj%C3%B6_1.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: Sinikka Halme (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'resources',
    _id: 'inDfjHKjmkNcnAuwv',
    label: 'Badplatsen Kvarnsjön, Sjötofta',
    url: `${THUMB}/e/eb/K%C3%A5sj%C3%B6n.jpg/1280px-K%C3%A5sj%C3%B6n.jpg`,
    credit: 'Exempelbild, inte från platsen. Foto: David Castor (dcastor) (CC0, Wikimedia Commons).',
  },
  {
    collection: 'groups',
    _id: 'eT5buMrSfMGbPpN5c',
    label: 'Uddebo textilkollektiv',
    url: `${THUMB}/d/d2/Simplon_Dorf_Webstuhl.jpg/1280px-Simplon_Dorf_Webstuhl.jpg`,
    credit: 'Exempelbild, inte från föreningen. Foto: Paebi (CC BY-SA 4.0, Wikimedia Commons).',
  },
  {
    collection: 'groups',
    _id: 'k8wbSb2uwuB6dLwZY',
    label: 'Tranemo kammarkör',
    url: `${THUMB}/c/c1/Mikaeli_kammark%C3%B6r.JPG/1280px-Mikaeli_kammark%C3%B6r.JPG`,
    credit: 'Exempelbild, inte från föreningen. Foto: I99pema (CC BY-SA 3.0, Wikimedia Commons).',
  },
];

let updated = 0;
photos.forEach((photo) => {
  const isGroup = photo.collection === 'groups';
  const doc = db[photo.collection].findOne({ _id: photo._id });
  const name = isGroup ? doc?.title : doc?.label;
  if (!doc || name !== photo.label) {
    print(`SKIP  ${photo.label}: not found, or now called "${name}"`);
    return;
  }
  const hasPicture = isGroup ? Boolean(doc.imageUrl) : Boolean(doc.images?.length);
  if (hasPicture) {
    return;
  }
  const description = doc.description || '';
  const credit = `<p><em>${photo.credit}</em></p>`;
  const set = isGroup ? { imageUrl: photo.url } : { images: [photo.url] };
  if (!description.includes(photo.credit)) {
    set.description = description + credit;
  }
  db[photo.collection].updateOne({ _id: photo._id }, { $set: set });
  updated += 1;
});

print(`${updated} of ${photos.length} pictures added.`);
