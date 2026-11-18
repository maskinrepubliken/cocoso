import { Meteor } from 'meteor/meteor';

import { cleanContact } from '../_utils/contact';
import { requireOrganizerContact } from '../activities/activity.organizers';

// How a place is reached, as an event or a group is: either
//   contactUserId   one of its managers, whose public contact details are
//                   shown (and follow their profile), or
//   contact         contact details of its own,
// or neither: a place need not have any.

// What to store: `{ contactUserId }` for a manager who can be reached,
// `{ contact }`, or nothing. `managerIds` are those who may be chosen.
export async function cleanPlaceContact(values, managerIds) {
  if (values?.contactUserId) {
    if (!(managerIds || []).includes(values.contactUserId)) {
      throw new Meteor.Error('not-manager', 'Not one of the place’s managers');
    }
    await requireOrganizerContact([values.contactUserId]);
    return { contactUserId: values.contactUserId };
  }
  const contact = cleanContact(values?.contact);
  return contact ? { contact } : {};
}

// The place as its page shows it: with the chosen manager's contact
// details in `contact`, and who they are in `contactPerson`.
export async function attachPlaceContact(resource) {
  if (!resource?.contactUserId) {
    return resource;
  }
  const user = await Meteor.users.findOneAsync(resource.contactUserId, {
    fields: {
      username: 1,
      firstName: 1,
      lastName: 1,
      avatar: 1,
      publicContact: 1,
    },
  });
  if (!user) {
    return resource;
  }
  return {
    ...resource,
    contact: cleanContact(user.publicContact),
    contactPerson: {
      _id: user._id,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      avatar: user.avatar?.src || null,
    },
  };
}
