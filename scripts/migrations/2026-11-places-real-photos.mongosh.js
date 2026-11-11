/* global APPLY, KEEP_REQUIRED_CREDITS */
// Keeps only the places (resources) that show a photo of the place itself,
// and tidies them:
//
// - deletes places without a picture or whose picture is an example of
//   another place ("Exempelbild, inte från platsen"), unless an event is held
//   there (those are listed and kept);
// - removes the Wikimedia Commons credits from the descriptions of every
//   place that is left;
// - drops the village from the name ("Centralen, Tranemo" → "Centralen"),
//   also in the copy of the name that events keep (activities.resource).
//
// Shows what it would do; changes nothing unless APPLY is set:
//
//   mongosh cocoso --file scripts/migrations/2026-11-places-real-photos.mongosh.js
//   mongosh cocoso --eval 'var APPLY = true' --file scripts/migrations/2026-11-places-real-photos.mongosh.js
//
// Most of the remaining photos are CC BY-SA, which requires crediting the
// photographer where the photo is shown. With KEEP_REQUIRED_CREDITS set, the
// credits of CC BY and CC BY-SA photos are kept and only the others removed.
//
// Idempotent: a second run finds nothing to do.

const apply = typeof APPLY !== 'undefined' && APPLY === true;
const keepRequired = typeof KEEP_REQUIRED_CREDITS !== 'undefined' && KEEP_REQUIRED_CREDITS === true;

const CREDIT_BLOCK = /<p><em>(?:(?!<\/em>)[\s\S])*?Wikimedia Commons(?:(?!<\/em>)[\s\S])*?<\/em><\/p>/g;
const CREDIT_INLINE = /\s*Foto:[^<]*?Wikimedia Commons\)\.?/g;
const required = (credit) => /\(CC BY(-SA)? /.test(credit);

function stripCredits(description) {
  const drop = (credit) => (keepRequired && required(credit) ? credit : '');
  return description.replace(CREDIT_BLOCK, drop).replace(CREDIT_INLINE, drop).trim();
}

const withoutVillage = (label) => label.replace(/,\s*[^,]+$/, '').trim();
const hasRealPhoto = (r) => (r.images || []).length > 0 && !/Exempelbild/i.test(r.description || '');

print(apply ? '== ÄNDRAR' : '== PROVKÖRNING (inget ändras; kör med APPLY för att ändra)');

let deleted = 0, kept = 0, renamed = 0, credits = 0, events = 0;
db.resources.find().sort({ label: 1 }).forEach((r) => {
  if (!hasRealPhoto(r)) {
    const usedBy = db.activities.countDocuments({ resourceId: r._id });
    if (usedBy > 0) {
      print(`behålls, ${usedBy} evenemang hålls där: ${r.label}`);
      kept++;
    } else {
      print(`tas bort: ${r.label}`);
      if (apply) db.resources.deleteOne({ _id: r._id });
      deleted++;
      return;
    }
  }

  const set = {};
  const label = withoutVillage(r.label);
  if (label !== r.label) { set.label = label; renamed++; }
  const description = stripCredits(r.description || '');
  if (description !== (r.description || '')) { set.description = description; credits++; }
  if (Object.keys(set).length === 0) return;

  print(`ändras: ${r.label}${set.label ? ` → ${set.label}` : ''}${set.description !== undefined ? ' (kreditering borttagen)' : ''}`);
  if (apply) {
    db.resources.updateOne({ _id: r._id }, { $set: { ...set, updatedAt: new Date() } });
    if (set.label) events += db.activities.updateMany({ resourceId: r._id }, { $set: { resource: set.label } }).modifiedCount;
  }
});

print(`\n${deleted} tas bort, ${kept} behålls för att evenemang hålls där, ${renamed} byter namn, ${credits} får krediteringen borttagen${apply ? `, ${events} evenemang fick det nya namnet` : ''}.`);
print(`Platser kvar: ${apply ? db.resources.countDocuments() : db.resources.countDocuments() - deleted}`);
