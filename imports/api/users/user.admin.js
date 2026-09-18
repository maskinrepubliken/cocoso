import { Meteor } from 'meteor/meteor';

import { isAdmin, isContributorOrAdmin, isContributor } from './user.roles';
import Activities from '../activities/activity';
import Memberships from '../memberships/membership';

Meteor.methods({
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

      // const currentHost = await getSite();
      // const hostName = currentHost.settings.name;
      // Meteor.callAsync(
      //   'sendEmail',
      //   memberId,
      //   `You are removed from ${hostName} as a verified member`,
      //   `Hi,\n\nWe're sorry to inform you that you're removed as an active member at ${currentHost.name}. You are, however, still welcome to participate to the events and groups here.\n\n For questions, please contact the admin.\n\nKind regards,\n${currentHost.name} Team`
      // );
    } catch (error) {
      throw new Meteor.Error(error, 'Did not work! :/');
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
