import { Meteor } from 'meteor/meteor';
import Memberships from '../memberships/membership';

Meteor.publish('currentUser', function () {
  const userId = this.userId;
  if (!userId) {
    return null;
  }
  const user = Meteor.users.find(
    { _id: userId },
    {
      fields: {
        avatar: 1,
        bio: 1,
        contactInfo: 1,
        emails: 1,
        firstName: 1,
        groups: 1,
        isPublic: 1,
        isSuperAdmin: 1,
        keywords: 1,
        lang: 1,
        lastName: 1,
        notifications: 1,
        unreadMessageCount: 1,
        publicKey: 1,
        username: 1,
        blockedUserIds: 1,
      },
    }
  );
  return user;
});

// Every membership doc for the logged-in user — the client reattaches this
// as `currentUser.memberships` (see WrapperHybrid.tsx) since it no longer
// lives on the user doc itself.
Meteor.publish('myMemberships', function () {
  if (!this.userId) {
    return this.ready();
  }
  return Memberships.find({ userId: this.userId });
});
