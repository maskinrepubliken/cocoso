/* global db, ALL */
// Files the platser under kinds (`kinds`, see
// imports/ui/pages/resources/resourceKinds.ts) by what their names say.
// A place gets every kind whose rule matches, e.g. the sim- och
// idrottshall is both a hall and a place to swim.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-resource-kinds.mongosh.js
//
// Idempotent: only places without kinds are touched. To file every place
// again from the rules, run with --eval 'var ALL = true' before --file.

const rules = [
  ['kultur', /Centralen|bibliotek|Glasets Hus|Väveriet|torget|stenhus|hembygdspark/i],
  ['sevardhet', /Glasets Hus|stenhus|herrgård|hembygdspark/i],
  ['idrottshall', /idrottshall|hallen|gymnastiksal|ishall|curlinghall|^Lindstorp/i],
  ['idrottsplats', /skatepark|vallen|^Tranehov|^Dalshov|^Ekelid|^Grimsborg|^Vallskoga|^Idrottsparken|^Sjövalla|friluftsgård|fritidsstuga/i],
  ['bad', /^Badplatsen|bassäng|sim- och/i],
  ['friluft', /friluftsgård|fritidsstuga|fiskecamp|runt$|herrgård/i],
];

const selector =
  typeof ALL !== 'undefined' && ALL
    ? {}
    : { $or: [{ kinds: { $exists: false } }, { kinds: { $size: 0 } }] };

let filed = 0;
db.resources.find(selector).forEach((resource) => {
  const kinds = rules.filter(([, re]) => re.test(resource.label)).map(([key]) => key);
  if (!kinds.length) {
    print(`  ${resource.label} -> (no kind, set it by hand)`);
    return;
  }
  db.resources.updateOne(
    { _id: resource._id },
    { $set: { kinds }, $unset: { category: 1 } }
  );
  print(`  ${resource.label} -> ${kinds.join(', ')}`);
  filed += 1;
});
print(`filed ${filed} place(s)`);
