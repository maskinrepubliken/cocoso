import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import Groups from './group';
import { cleanContact, isReachable, requireContact } from '../_utils/contact';
import { isAdmin } from '../users/user.roles';

// How a group is reached, as an event is: either
//   contactUserId   one of its owners, whose public contact details are
//                   shown (and follow their profile), or
//   contact         contact details of its own.
// One of them is required.

const personFields = {
  username: 1,
  firstName: 1,
  lastName: 1,
  avatar: 1,
  publicContact: 1,
};

const ownerIdsOf = (group) =>
  (group?.members || []).filter((m) => m.isAdmin).map((m) => m.memberId);

// What to store: `{ contactUserId }` for an owner who can be reached, or
// `{ contact }`. `ownerIds` are those who may be chosen.
export async function cleanGroupContact(values, ownerIds) {
  if (values?.contactUserId) {
    if (!ownerIds.includes(values.contactUserId)) {
      throw new Meteor.Error('not-owner', 'Not one of the group’s owners');
    }
    const owner = await Meteor.users.findOneAsync(values.contactUserId, {
      fields: { publicContact: 1 },
    });
    if (!isReachable(owner?.publicContact)) {
      throw new Meteor.Error(
        'owner-contact-required',
        'The owner needs an email or a phone in their profile'
      );
    }
    return { contactUserId: values.contactUserId };
  }
  return { contact: requireContact(values?.contact) };
}

// The group as its page shows it: with the chosen owner's contact details
// in `contact`, and who they are in `contactPerson`.
export async function attachGroupContact(group) {
  if (!group?.contactUserId) {
    return group;
  }
  const user = await Meteor.users.findOneAsync(group.contactUserId, {
    fields: personFields,
  });
  if (!user) {
    return group;
  }
  return {
    ...group,
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

Meteor.methods({
  // For the group form: the owners whose contact details the group may
  // show, with those details. A new group's only owner is its creator.
  async getGroupOwnerContacts(groupId) {
    check(groupId, Match.Maybe(String));
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('not-allowed', 'Not allowed');
    }
    let ownerIds = [user._id];
    if (groupId) {
      const group = await Groups.findOneAsync(groupId, {
        fields: { members: 1 },
      });
      if (!group) {
        throw new Meteor.Error('not-found', 'Group not found');
      }
      const isOwner = ownerIdsOf(group).includes(user._id);
      if (!isOwner && !(await isAdmin(user._id))) {
        throw new Meteor.Error('not-allowed', 'Not allowed');
      }
      ownerIds = ownerIdsOf(group);
    }
    const owners = await Meteor.users
      .find({ _id: { $in: ownerIds } }, { fields: personFields })
      .fetchAsync();
    return owners.map((owner) => ({
      _id: owner._id,
      username: owner.username,
      firstName: owner.firstName || '',
      lastName: owner.lastName || '',
      avatar: owner.avatar?.src || null,
      publicContact: cleanContact(owner.publicContact),
    }));
  },
});

export { ownerIdsOf };
