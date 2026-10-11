// Files the example events under a kind (category.key, see
// imports/ui/pages/activities/eventKinds.ts) by what their titles say.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-example-event-kinds.mongosh.js
//
// Idempotent: only events without a category are touched.

const rules = [
  ['idrott', /gympa|innebandy|curling|bad|skate|stavgång|simhall/i],
  ['barn', /barn|baby|familj|pyssel|höstlov/i],
  ['marknad', /marknad|loppis/i],
  ['mat', /mat|julbord|café|cafe/i],
  ['natur', /vandring|promenad|utflykt/i],
  ['larande', /läxhjälp|föreläsning|språk|bokcirkel|författar|historia/i],
  ['kultur', /konsert|kör|glas|väv|textil|lucia|film|teater|musik/i],
  ['social', /brädspel|fredagskväll|gemenskap|stickcafé|kväll/i],
];

let filed = 0;
db.activities.find({ isPublicActivity: true, category: { $exists: false } }).forEach((activity) => {
  const rule = rules.find(([, re]) => re.test(activity.title));
  if (!rule) return;
  db.activities.updateOne({ _id: activity._id }, { $set: { category: { key: rule[0] } } });
  print(`  ${activity.title} -> ${rule[0]}`);
  filed += 1;
});
print(`filed ${filed} event(s)`);
