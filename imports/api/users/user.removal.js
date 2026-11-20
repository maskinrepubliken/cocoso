import { Meteor } from 'meteor/meteor';

import Activities from '../activities/activity';
import Memberships from '../memberships/membership';
import Resources from '../resources/resource';
import {
  ActivityFollows,
  PushSubscriptions,
} from '../notifications/notification';

/**
 * What goes with a user who is removed, the same for an account its owner
 * deletes (deleteAccount) and an alias an admin removes (deleteAlias):
 * the role, what they follow, and every place where they are named as
 * someone to turn to. The user document itself is the caller's to remove.
 *
 * The events they are the organizer of stay. One with co-organizers goes
 * to the first of them, who becomes its organizer. One without is left
 * with no organizer: the event page says that the organizer has been
 * removed (attachOrganizerProfiles sets `organizerRemoved`), and only
 * admins can change it.
 */

// Their events that have a co-organizer get that person as organizer. The
// first one listed whose account still exists takes over.
async function handOverEvents(userId) {
  const events = await Activities.find(
    { authorId: userId, 'organizers.0': { $exists: true } },
    { fields: { organizers: 1 } }
  ).fetchAsync();
  for (const event of events) {
    const candidates = event.organizers.filter((o) => o.userId !== userId);
    const existing = await Meteor.users
      .find(
        { _id: { $in: candidates.map((o) => o.userId) } },
        { fields: { username: 1 } }
      )
      .fetchAsync();
    const heir = candidates
      .map((o) => existing.find((u) => u._id === o.userId))
      .find(Boolean);
    if (heir) {
      await Activities.updateAsync(
        { _id: event._id },
        {
          $set: { authorId: heir._id, authorName: heir.username },
          $pull: { organizers: { userId: heir._id } },
        }
      );
    }
  }
}

// How many of their events removing them hands to a co-organizer, and how
// many it leaves without an organizer. For the question asked first.
export async function eventsLeftBy(userId) {
  const organized = await Activities.find({ authorId: userId }).countAsync();
  const handedOver = await Activities.find({
    authorId: userId,
    organizers: { $elemMatch: { userId: { $ne: userId } } },
  }).countAsync();
  return { handedOver, orphaned: organized - handedOver };
}
export async function detachUser(userId) {
  await Memberships.removeAsync({ userId });
  // No more push to their browsers, no events followed
  await PushSubscriptions.removeAsync({ userId });
  await ActivityFollows.removeAsync({ userId });

  await handOverEvents(userId);
  // No longer a co-organizer, nor the one whose contact details an event
  // shows
  await Activities.updateAsync(
    { 'organizers.userId': userId },
    { $pull: { organizers: { userId } } },
    { multi: true }
  );
  await Activities.updateAsync(
    { contactUserId: userId },
    { $unset: { contactUserId: '' } },
    { multi: true }
  );

  // No longer among those who look after a place, nor its contact
  await Resources.updateAsync(
    { managerIds: userId },
    { $pull: { managerIds: userId } },
    { multi: true }
  );
  for (const field of [
    'contactUserId',
    'booking.contactUserId',
    'commerce.contactUserId',
  ]) {
    await Resources.updateAsync(
      { [field]: userId },
      { $unset: { [field]: '' } },
      { multi: true }
    );
  }
}
