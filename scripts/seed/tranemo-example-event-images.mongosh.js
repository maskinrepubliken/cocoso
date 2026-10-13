// Gives each example event (tranemo-example-events.mongosh.js) a photograph
// that fits its theme.
//
//   mongosh --quiet "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-example-event-images.mongosh.js
//
// Every photo is on Wikimedia Commons under CC0, public domain, CC BY or
// CC BY-SA, and is linked rather than copied (imageHelper passes external
// URLs through). CC BY and CC BY-SA require crediting the photographer, so the
// credit is appended to the event description. Re-running is safe: the image
// is set again and a credit is only appended once.

const photos = [
  {
    title: "Stickcafé på biblioteket",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Nadeln_002_2026_08_07.jpg/1280px-Nadeln_002_2026_08_07.jpg",
    credit: "Foto: Friedrich Haag (CC BY-SA 4.0, Wikimedia Commons).",
  },
  {
    title: "Innebandy för vuxna",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/WFC2022_Slovakia_vs_Poland_B_16.jpg/1280px-WFC2022_Slovakia_vs_Poland_B_16.jpg",
    credit: "Foto: Albinfo (CC BY-SA 4.0, Wikimedia Commons).",
  },
  {
    title: "Öppen glasverkstad",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Murano_furnace_and_pipe.jpg/1280px-Murano_furnace_and_pipe.jpg",
    credit: "Foto: Wknight94 (CC BY-SA 3.0, Wikimedia Commons).",
  },
  {
    title: "Vävstuga i Uddebo",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Handloom_3.jpg/1280px-Handloom_3.jpg",
    credit: "Foto: Bhagirathipatra (public domain, Wikimedia Commons).",
  },
  {
    title: "Höstvandring runt Tranemosjön",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Autumn_forest_-_Flickr_-_Stiller_Beobachter_%283%29.jpg/1280px-Autumn_forest_-_Flickr_-_Stiller_Beobachter_%283%29.jpg",
    credit: "Foto: Stiller Beobachter from Ansbach, Germany (CC BY 2.0, Wikimedia Commons).",
  },
  {
    title: "Språkcafé – prata svenska",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/Muffin%2C_Einsteins_Coffee_Murdoch_Square%2C_2025_%2801%29.jpg/1280px-Muffin%2C_Einsteins_Coffee_Murdoch_Square%2C_2025_%2801%29.jpg",
    credit: "Foto: Bahnfrend (CC BY-SA 4.0, Wikimedia Commons).",
  },
  {
    title: "Bokcirkel: höstens deckare",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/Books-bookshelf-bookstore-159778.jpg/1280px-Books-bookshelf-bookstore-159778.jpg",
    credit: "Foto: MorningbirdPhoto (CC0, Wikimedia Commons).",
  },
  {
    title: "Skördemarknad i hembygdsparken",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Pumpkins_in_a_market_in_Istanbul.jpg/1280px-Pumpkins_in_a_market_in_Istanbul.jpg",
    credit: "Foto: John Cummings (CC BY-SA 4.0, Wikimedia Commons).",
  },
  {
    title: "Skatejam i Trainspot",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Skateboarder_jumping_off_a_ledge_at_Skatepark_des_Ursulines_in_Brussels_%28DSCF4486%29.jpg/1280px-Skateboarder_jumping_off_a_ledge_at_Skatepark_des_Ursulines_in_Brussels_%28DSCF4486%29.jpg",
    credit: "Foto: Trougnouf (CC BY 4.0, Wikimedia Commons).",
  },
  {
    title: "Matlagningskväll: syrisk mat",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/Hummus%2C_falafel%2C_pita_bread%2C_and_mafrouka_at_Agasi%2C_Lajpat_Nagar_%28July_2025%29.jpg/1280px-Hummus%2C_falafel%2C_pita_bread%2C_and_mafrouka_at_Agasi%2C_Lajpat_Nagar_%28July_2025%29.jpg",
    credit: "Foto: Contrapunctus-1 (CC0, Wikimedia Commons).",
  },
  {
    title: "Höstlovsbad i simhallen",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Access_ramp_on_indoor_pool%2C_Runcorn_Swimming_Pool%2C_Runcorn_DSCF6201.jpg/1280px-Access_ramp_on_indoor_pool%2C_Runcorn_Swimming_Pool%2C_Runcorn_DSCF6201.jpg",
    credit: "Foto: John Robert McPherson (CC0, Wikimedia Commons).",
  },
  {
    title: "Glasets historia – föreläsning",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Engraved_crystal_glass_vase%2C_Flickan_som_niger_f%C3%B6r_nym%C3%A5ne_-_back.jpg/1280px-Engraved_crystal_glass_vase%2C_Flickan_som_niger_f%C3%B6r_nym%C3%A5ne_-_back.jpg",
    credit: "Foto: W.carter (CC BY-SA 4.0, Wikimedia Commons).",
  },
  {
    title: "Curling – prova på",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Curling_in_East_York.jpg/1280px-Curling_in_East_York.jpg",
    credit: "Foto: Benson Kua from Toronto, Canada (CC BY-SA 2.0, Wikimedia Commons).",
  },
  {
    title: "Författarbesök på biblioteket",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Bookshelves_and_interior_of_the_library_of_the_Academy_for_Judiciary.jpg/1280px-Bookshelves_and_interior_of_the_library_of_the_Academy_for_Judiciary.jpg",
    credit: "Foto: Szeronine (CC BY 4.0, Wikimedia Commons).",
  },
  {
    title: "Textilmarknad i Väveriet",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Rolls_of_fabric_of_multiple_colors_%28181099191%29.jpg/1280px-Rolls_of_fabric_of_multiple_colors_%28181099191%29.jpg",
    credit: "Foto: Daniel Aufgang (CC BY 3.0, Wikimedia Commons).",
  },
  {
    title: "Julpyssel för barn",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/07/Star_Christmas_ornament.jpg/1280px-Star_Christmas_ornament.jpg",
    credit: "Foto: Olugold (CC BY-SA 4.0, Wikimedia Commons).",
  },
  {
    title: "Adventsmarknad på Forumtorget",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Ko%C5%A1ice_-_Hlavn%C3%A1_ulica_%28Main_street%29%2C_northern_half_-_Christmas_market_and_market_stalls_on_the_Main_street_in_Ko%C5%A1ice_%28December_2025%29_31.jpg/1280px-Ko%C5%A1ice_-_Hlavn%C3%A1_ulica_%28Main_street%29%2C_northern_half_-_Christmas_market_and_market_stalls_on_the_Main_street_in_Ko%C5%A1ice_%28December_2025%29_31.jpg",
    credit: "Foto: ZemplinTemplar (CC BY-SA 4.0, Wikimedia Commons).",
  },
  {
    title: "Luciakonsert i Glasets Hus",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Lucia_p%C3%A5_Naturhistoriska_riksmuseet_2.jpg/1280px-Lucia_p%C3%A5_Naturhistoriska_riksmuseet_2.jpg",
    credit: "Foto: IngimarE (CC BY-SA 4.0, Wikimedia Commons).",
  },
  {
    title: "Julbord och gemenskap",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Julbord.jpg/1280px-Julbord.jpg",
    credit: "Foto: Andejons (CC BY-SA 3.0, Wikimedia Commons).",
  },
  {
    title: "Läxhjälp för högstadiet",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/Study_Break_-_Reading_at_Tulane_University%2C_2009.jpg/1280px-Study_Break_-_Reading_at_Tulane_University%2C_2009.jpg",
    credit: "Foto: Tulane Public Relations (CC BY 2.0, Wikimedia Commons).",
  },
  {
    title: "Brädspelskväll på Centralen",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Brettspiel_Mensch_%C3%A4rger_dich_nicht.jpg/1280px-Brettspiel_Mensch_%C3%A4rger_dich_nicht.jpg",
    credit: "Foto: Tetzemann (CC0, Wikimedia Commons).",
  },
  {
    title: "Fredagskväll i Trainspot",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Skateboard_ramp_%40_Flevopark_%40_Amsterdam_Oost_%2822413486709%29.jpg/1280px-Skateboard_ramp_%40_Flevopark_%40_Amsterdam_Oost_%2822413486709%29.jpg",
    credit: "Foto: Guilhem Vellut from Annecy, France (CC BY 2.0, Wikimedia Commons).",
  },
  {
    title: "Lördagsloppis på Forumtorget",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Rth_Schoeneberg_08_flea_market.jpg/1280px-Rth_Schoeneberg_08_flea_market.jpg",
    credit: "Foto: A.Savin (CC BY-SA 3.0, Wikimedia Commons).",
  },
  {
    title: "Söndagspromenad med stavgång",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Nordic_Walking_is_enjoyed_by_all.jpg/1280px-Nordic_Walking_is_enjoyed_by_all.jpg",
    credit: "Foto: Vijay.shivu (CC BY-SA 4.0, Wikimedia Commons).",
  },
  {
    title: "Familjebad på söndagar",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/Children%27s_Pool_for_SaiGaau_Swimming_Pool.jpg/1280px-Children%27s_Pool_for_SaiGaau_Swimming_Pool.jpg",
    credit: "Foto: PQ77wd (CC BY-SA 4.0, Wikimedia Commons).",
  },
  {
    title: "Seniorgympa i Dalstorp",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/Gym_Dumbbells_For_Working_Out_%28193383405%29.jpeg/1280px-Gym_Dumbbells_For_Working_Out_%28193383405%29.jpeg",
    credit: "Foto: Sterling (CC BY 3.0, Wikimedia Commons).",
  },
  {
    title: "Körövning med kammarkören",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Houston_Chamber_Choir_singing_at_the_Villa_de_Matel.jpg/1280px-Houston_Chamber_Choir_singing_at_the_Villa_de_Matel.jpg",
    credit: "Foto: Rrwagner59 (CC BY-SA 4.0, Wikimedia Commons).",
  },
  {
    title: "Curling för nybörjare",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/12-01-20-yog-814.jpg/1280px-12-01-20-yog-814.jpg",
    credit: "Foto: Ralf Roletschek (CC BY-SA 3.0 AT, Wikimedia Commons).",
  },
  {
    title: "Babysång på biblioteket",
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d0/The_children%27s_library_at_the_Broomfield_Library.jpg/1280px-The_children%27s_library_at_the_Broomfield_Library.jpg",
    credit: "Foto: HonjuTheCat (CC0, Wikimedia Commons).",
  },
];

let updated = 0;
photos.forEach(({ title, url, credit }) => {
  const activity = db.activities.findOne({ title });
  if (!activity) {
    print(`skipped "${title}": no such event`);
    return;
  }
  const line = `<p><em>${credit}</em></p>`;
  const description = activity.longDescription || '';
  db.activities.updateOne(
    { _id: activity._id },
    {
      $set: {
        images: [url],
        longDescription: description.includes(credit)
          ? description
          : description + line,
      },
    }
  );
  updated += 1;
});

print(`event images: ${updated} of ${photos.length} set`);
