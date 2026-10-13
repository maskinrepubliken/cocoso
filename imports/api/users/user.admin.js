import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';

import { isAdmin, isContributorOrAdmin, isContributor } from './user.roles';
import Activities from '../activities/activity';
import Memberships from '../memberships/membership';

Meteor.methods({
  // Lets an admin see the site as another (non-admin) member: a fresh login
  // token for that member is issued and returned, and the client logs in
  // with it. The admin's own token stays in the browser so they can switch
  // back; logging out of the borrowed session removes the token again.
  async viewAsUser(memberId) {
    check(memberId, String);
    const user = await Meteor.userAsync();
    if (!user || !(await isAdmin(user._id))) {
      throw new Meteor.Error('not-allowed', 'Only admins can view as a member');
    }
    if (memberId === user._id) {
      throw new Meteor.Error('same-user', 'You are already this user');
    }
    const membership = await Memberships.findOneAsync({ userId: memberId });
    if (!membership || membership.role === 'admin') {
      throw new Meteor.Error(
        'not-a-member',
        'Only verified or non-verified members can be viewed as'
      );
    }
    const stamped = Accounts._generateStampedLoginToken();
    await Accounts._insertLoginToken(memberId, stamped);
    // eslint-disable-next-line no-console
    console.log(
      `[view-as] admin ${user.username} (${user._id}) now views as ${memberId}`
    );
    return stamped.token;
  },

  async setAsAdmin(memberId) {
    const user = await Meteor.userAsync();
    const isAdminUser = await isAdmin(user._id);

    if (!isAdminUser) {
      throw new Meteor.Error('You are not allowed');
    }

    const memberMembership = await Memberships.findOneAsync({
      userId: memberId,
    });

    if (
      !memberMembership ||
      !['contributor', 'participant'].includes(memberMembership.role)
    ) {
      throw new Meteor.Error('User is does not have a role');
    }

    try {
      await Memberships.updateAsync(
        { userId: memberId },
        { $set: { role: 'admin' } }
      );
      await Meteor.users.updateAsync(memberId, {
        $set: {
          verifiedBy: {
            username: user.username,
            userId: user._id,
            date: new Date(),
          },
        },
      });
      await Meteor.callAsync('sendNewAdminEmail', memberId);
    } catch (error) {
      throw new Meteor.Error(error, 'Did not work! :/');
    }
  },

  async setAsContributor(memberId) {
    const user = await Meteor.userAsync();

    if (!(await isContributorOrAdmin(user._id))) {
      throw new Meteor.Error('You are not allowed');
    }

    const memberMembership = await Memberships.findOneAsync({
      userId: memberId,
    });
    if (!memberMembership || memberMembership.role !== 'participant') {
      throw new Meteor.Error(
        'not-a-participant',
        'Only participants can be verified as contributors'
      );
    }

    try {
      await Memberships.updateAsync(
        { userId: memberId },
        { $set: { role: 'contributor' } }
      );
      await Meteor.users.updateAsync(memberId, {
        $set: {
          verifiedBy: {
            username: user.username,
            userId: user._id,
            date: new Date(),
          },
        },
      });
      await Meteor.callAsync('sendNewContributorEmail', memberId);
    } catch (error) {
      throw new Meteor.Error(error, 'Did not work! :/');
    }
  },

  async setAsParticipant(memberId) {
    const user = await Meteor.userAsync();

    const isAdminUser = await isAdmin(user._id);

    if (!isAdminUser) {
      throw new Meteor.Error('You are not allowed');
    }

    if (!(await isContributor(memberId))) {
      throw new Meteor.Error('User is not verified');
    }

    try {
      await Memberships.updateAsync(
        { userId: memberId },
        { $set: { role: 'participant' } }
      );
      await Meteor.users.updateAsync(memberId, {
        $set: {
          unVerifiedBy: {
            username: user.username,
            userId: user._id,
            date: new Date(),
          },
        },
      });

      // const site = await getSite();
      // const hostName = site.settings.name;
      // Meteor.callAsync(
      //   'sendEmail',
      //   memberId,
      //   `You are removed from ${hostName} as a verified member`,
      //   `Hi,\n\nWe're sorry to inform you that you're removed as an active member at ${site.name}. You are, however, still welcome to participate to the events and groups here.\n\n For questions, please contact the admin.\n\nKind regards,\n${site.name} Team`
      // );
    } catch (error) {
      throw new Meteor.Error(error, 'Did not work! :/');
    }
  },

  // Organizers are listed on /people; the flag is independent of the role.
  async setOrganizer(memberId, isOrganizer) {
    check(memberId, String);
    check(isOrganizer, Boolean);
    const user = await Meteor.userAsync();

    if (!(await isAdmin(user?._id))) {
      throw new Meteor.Error('not-allowed', 'You are not allowed');
    }

    const updated = await Memberships.updateAsync(
      { userId: memberId },
      { $set: { isOrganizer } }
    );
    if (!updated) {
      throw new Meteor.Error('not-a-member', 'User is not a member');
    }
  },

  async getActivitiesbyUserId(userId) {
    const currentUser = await Meteor.userAsync();

    if (!currentUser) {
      throw new Meteor.Error('You are not allowed');
    }

    const isAdminUser = await isAdmin(currentUser._id);

    if (!(await isContributorOrAdmin(currentUser._id))) {
      throw new Meteor.Error(
        'You can not create activities without being verified'
      );
    }
    if (userId !== currentUser._id && !isAdminUser) {
      throw new Meteor.Error('You are not allowed');
    }

    try {
      return await Activities.find({ authorId: userId }).fetchAsync();
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },
});
