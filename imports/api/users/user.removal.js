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
 * The events they are the organizer of stay, without an organizer: the
 * event page says that the organizer has been removed
 * (attachOrganizerProfiles sets `organizerRemoved`), and only admins can
 * change them.
 */
export async function detachUser(userId) {
  await Memberships.removeAsync({ userId });
  // No more push to their browsers, no events followed
  await PushSubscriptions.removeAsync({ userId });
  await ActivityFollows.removeAsync({ userId });

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
