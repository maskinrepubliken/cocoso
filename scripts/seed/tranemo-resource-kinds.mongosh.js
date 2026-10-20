// Files the platser under a kind (category.key, see
// imports/ui/pages/resources/resourceKinds.ts) by what their names say.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-resource-kinds.mongosh.js
//
// Idempotent: only places without a category are touched. The first rule
// that matches wins, so the swimming spots come before the halls.

const rules = [
  ['bad', /^Badplatsen|bassäng/i],
  ['idrottshall', /idrottshall|hallen|gymnastiksal|ishall|curlinghall|^Lindstorp/i],
  ['idrottsplats', /skatepark|vallen|^Tranehov|^Dalshov|^Ekelid|^Grimsborg|^Vallskoga|^Idrottsparken|^Sjövalla/i],
  ['friluft', /friluftsgård|fritidsstuga|fiskecamp|runt$/i],
  ['sevardhet', /stenhus|herrgård|hembygdspark/i],
  ['kultur', /Centralen|bibliotek|Glasets Hus|Väveriet|torget/i],
];

let filed = 0;
db.resources.find({ category: { $exists: false } }).forEach((resource) => {
  const rule = rules.find(([, re]) => re.test(resource.label));
  if (!rule) {
    print(`  ${resource.label} -> (no kind, set it by hand)`);
    return;
  }
  db.resources.updateOne({ _id: resource._id }, { $set: { category: { key: rule[0] } } });
  print(`  ${resource.label} -> ${rule[0]}`);
  filed += 1;
});
print(`filed ${filed} place(s)`);
