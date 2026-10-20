/* global ALL */
// Files the example events under kinds (`kinds`, see
// imports/ui/pages/activities/eventKinds.ts) by what their titles say.
// An event gets every kind whose rule matches, e.g. a family swim is both
// sport and for children.
//
//   mongosh "mongodb://mongo:27017/cocoso" --file scripts/seed/tranemo-example-event-kinds.mongosh.js
//
// Idempotent: only events without kinds are touched. To file every event
// again from the rules, run with --eval 'var ALL = true' before --file.

const rules = [
  ['kultur', /konsert|körövning|kammarkör|glas|väv|textil|lucia|film|teater|musik|författar|bokcirkel|pyssel|babysång|stickcafé/i],
  ['idrott', /gympa|innebandy|curling|bad|skate|stavgång|simhall|vandring|fredagskväll i trainspot/i],
  ['barn', /barn|baby|familj|pyssel|höstlov|läxhjälp/i],
  ['marknad', /marknad|loppis/i],
  ['mat', /mat|julbord|skördemarknad|adventsmarknad/i],
  ['natur', /vandring|promenad|utflykt/i],
  ['larande', /läxhjälp|föreläsning|språk|bokcirkel|författar|historia|glasverkstad/i],
  ['social', /brädspel|fredagskväll|gemenskap|stickcafé|språkcafé|bokcirkel|vävstuga|matlagningskväll/i],
];

const selector = {
  isPublicActivity: true,
  ...(typeof ALL !== 'undefined' && ALL
    ? {}
    : { $or: [{ kinds: { $exists: false } }, { kinds: { $size: 0 } }] }),
};

let filed = 0;
db.activities.find(selector).forEach((activity) => {
  const kinds = rules.filter(([, re]) => re.test(activity.title)).map(([key]) => key);
  if (!kinds.length) return;
  db.activities.updateOne(
    { _id: activity._id },
    { $set: { kinds }, $unset: { category: 1 } }
  );
  print(`  ${activity.title} -> ${kinds.join(', ')}`);
  filed += 1;
});
print(`filed ${filed} event(s)`);
