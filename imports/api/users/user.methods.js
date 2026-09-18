import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check, Match } from 'meteor/check';

import { getSite } from '../site/site';
import { publicUrl } from '../_utils/shared';
import { extractEmailAddress } from '../_utils/services/mails/mail.helpers';
import Works from '../works/work';
import Groups from '../groups/group';
import DirectMessages from '../directMessages/directMessage';
import Memberships from '../memberships/membership';
import { getUserMemberships } from '../memberships/membership.helpers';

const userModel = async (user) => ({
  _id: user._id,
  avatar: user.avatar,
  bio: user.bio,
  contactInfo: user.contactInfo,
  firstName: user.firstName,
  keywords: user.keywords,
  lastName: user.lastName,
  username: user.username,
  memberships: await getUserMemberships(user._id),
});

Meteor.methods({
  async getCurrentUserLang() {
    const user = await Meteor.userAsync();
    if (!user) {
      return null;
    }
    return user.lang;
  },

  async getUserInfo(username) {
    check(username, String);

    const user = await Meteor.users.findOneAsync({ username });

    if (!user) {
      return null;
    }

    const currentUser = await Meteor.userAsync();

    if (user._id === currentUser?._id) {
      return await userModel(user);
    }

    const membership = await Memberships.findOneAsync({
      userId: user._id,
    });
    if (!membership?.isPublic) {
      return null;
    }

    return await userModel(user);
  },

  async createAccount(values) {
    check(values.email, String);
    check(values.username, String);
    check(values.password, String);

    const userExists = await Accounts.findUserByUsername(values.username);

    if (userExists) {
      throw new Meteor.Error('username-taken', 'Username is taken');
    }

    try {
      return await Accounts.createUserAsync(values);
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async isUsernameUnique(username) {
    check(username, String);
    if (username.length < 4) {
      return;
    }
    const usernameExists = await Accounts.findUserByUsername(username);
    return Boolean(usernameExists);
  },

  async isEmailUnique(email) {
    check(email, String);
    const emailExists = await Accounts.findUserByEmail(email);
    return Boolean(emailExists);
  },

  async setSelfAsParticipant() {
    const user = await Meteor.userAsync();
    if (!user) {
      return;
    }
    const site = await getSite();
    if (!site) {
      throw new Meteor.Error('Site not found');
    }

    const existingMembership = await Memberships.findOneAsync({
      userId: user._id,
    });
    if (existingMembership) {
      throw new Meteor.Error('You are already a participant');
    }

    try {
      await Memberships.insertAsync({
        userId: user._id,
        role: 'participant',
        joinDate: new Date(),
        isPublic: true,
      });

      await Meteor.callAsync('sendWelcomeEmail', user._id);
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async removeAsParticipant() {
    const user = await Meteor.userAsync();

    const membership = await Memberships.findOneAsync({
      userId: user._id,
    });

    if (!membership) {
      throw new Meteor.Error('You are already not a participant');
    }

    try {
      await Memberships.removeAsync({ userId: user._id });
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async saveUserInfo(values) {
    // Only these profile fields may be written by the user themself. Never
    // spread client input straight into $set on the users collection: the
    // schema also contains isSuperAdmin, encryption keys and block lists.
    check(values, {
      firstName: Match.Maybe(String),
      lastName: Match.Maybe(String),
      bio: Match.Maybe(String),
      contactInfo: Match.Maybe(String),
    });
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    try {
      await Meteor.users.updateAsync(user._id, {
        $set: {
          ...values,
        },
      });
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async setPreferredLanguage(lang) {
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      await Meteor.users.updateAsync(user._id, {
        $set: {
          lang,
        },
      });
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async setAvatar(avatar) {
    const user = await Meteor.userAsync();

    if (!user) {
      throw new Meteor.Error('Not allowed!');
    }

    if (!avatar) {
      throw new Meteor.Error('Not valid file');
    }

    const userId = user._id;

    const newAvatar = {
      src: avatar,
      date: new Date(),
    };

    try {
      await Meteor.users.updateAsync(userId, {
        $set: {
          avatar: newAvatar,
        },
      });

      await Works.updateAsync(
        {
          authorId: userId,
        },
        {
          $set: {
            authorAvatar: avatar,
          },
        },
        {
          multi: true,
        }
      );

      await Groups.updateAsync(
        {
          members: {
            $elemMatch: {
              memberId: userId,
            },
          },
        },
        {
          $set: {
            'members.$.avatar': avatar,
          },
        },
        {
          multi: true,
        }
      );

      await Groups.updateAsync(
        {
          authorId: userId,
        },
        {
          $set: {
            authorAvatar: avatar,
          },
        },
        {
          multi: true,
        }
      );

      // participantAvatars is a parallel array to participantIds, so the
      // positional operator cannot be used (it would resolve against the
      // filtered array, participantIds). Update each thread by index.
      const threads = await DirectMessages.find(
        { participantIds: userId },
        { fields: { participantIds: 1 } }
      ).fetchAsync();
      const thumbAvatar = avatar.replace('full', 'thumb');
      await Promise.all(
        threads.map((thread) => {
          const index = thread.participantIds.indexOf(userId);
          if (index === -1) return null;
          return DirectMessages.updateAsync(thread._id, {
            $set: { [`participantAvatars.${index}`]: thumbAvatar },
          });
        })
      );
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async getUserContactInfo(username) {
    try {
      const user = await Meteor.users.findOneAsync({ username });
      return user?.contactInfo;
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't retrieve the contact info");
    }
  },

  async setProfilePublicGlobally(isPublic) {
    check(isPublic, Boolean);
    const currentUser = await Meteor.userAsync();
    if (!currentUser) {
      throw new Meteor.Error('Not allowed!');
    }
    const userId = currentUser._id;

    try {
      await Meteor.users.updateAsync(
        {
          _id: userId,
        },
        {
          $set: {
            isPublic,
          },
        }
      );
      await Meteor.callAsync('setProfilePublic', isPublic);
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't update");
    }
  },

  async setProfilePublic(isPublic) {
    check(isPublic, Boolean);
    const currentUser = await Meteor.userAsync();
    if (!currentUser) {
      throw new Meteor.Error('Not allowed!');
    }
    const userId = currentUser._id;

    try {
      await Memberships.updateAsync({ userId }, { $set: { isPublic } });
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't update");
    }
  },

  removeAvatar: () => {},

  async leaveHost() {
    const user = await Meteor.userAsync();
    const userId = user?._id;

    if (!userId) {
      return;
    }

    try {
      await Memberships.removeAsync({ userId });
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async resetUserPassword(email) {
    Accounts.urls.resetPassword = function (token) {
      return publicUrl(`/reset-password/${token}`);
    };

    const site = await getSite();
    const siteName = site?.settings?.name;
    const smtp = Meteor.settings?.mailCredentials?.smtp;
    if (siteName && smtp?.fromEmail) {
      const fromEmail = extractEmailAddress(smtp.fromEmail);
      Accounts.emailTemplates.resetPassword.from = () =>
        `${siteName} <${fromEmail}>`;
    }
    Accounts.emailTemplates.siteName = siteName || Meteor.settings.public?.name;

    try {
      await Meteor.callAsync('forgotPassword', email);
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async deleteAccount() {
    const currentUser = await Meteor.userAsync();
    const userId = currentUser?._id;
    if (!userId) {
      throw new Meteor.Error('You are not a member anyways!');
    }
    try {
      await Memberships.removeAsync({ userId });

      Meteor.defer(async () => {
        Meteor.setTimeout(async () => {
          await Meteor.users.removeAsync(userId);
        }, 60000);
      });

      return true;
    } catch (error) {
      console.log(error);
      throw new Meteor.Error(error);
    }
  },

  async saveEncryptionKeys({ publicKey, encryptedPrivateKey, keySalt }) {
    check(publicKey, String);
    check(encryptedPrivateKey, String);
    check(keySalt, String);

    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('not-authorized');
    }

    await Meteor.users.updateAsync(user._id, {
      $set: { publicKey, encryptedPrivateKey, keySalt },
    });
  },

  async getEncryptionKeyBackup() {
    const user = await Meteor.userAsync();
    if (!user) throw new Meteor.Error('not-authorized');
    const doc = await Meteor.users.findOneAsync(user._id, {
      fields: { publicKey: 1, encryptedPrivateKey: 1, keySalt: 1 },
    });
    return doc || null;
  },

  async getPublicKey(targetUserId) {
    check(targetUserId, String);
    const user = await Meteor.users.findOneAsync(targetUserId, {
      fields: { publicKey: 1 },
    });
    return user?.publicKey || null;
  },

  async users_blockUser(targetUserId) {
    check(targetUserId, String);
    const user = await Meteor.userAsync();
    if (!user) throw new Meteor.Error('not-authorized');
    if (targetUserId === user._id)
      throw new Meteor.Error('invalid', 'Cannot block yourself.');
    await Meteor.users.updateAsync(user._id, {
      $addToSet: { blockedUserIds: targetUserId },
    });
  },

  async users_unblockUser(targetUserId) {
    check(targetUserId, String);
    const user = await Meteor.userAsync();
    if (!user) throw new Meteor.Error('not-authorized');
    await Meteor.users.updateAsync(user._id, {
      $pull: { blockedUserIds: targetUserId },
    });
  },

  async users_searchForMessages(query) {
    check(query, String);
    const caller = await Meteor.userAsync();
    if (!caller) throw new Meteor.Error('not-authorized');

    const q = query.trim().toLowerCase();

    const membershipsAtHost = await Memberships.find(
      {},
      { fields: { userId: 1 } }
    ).fetchAsync();
    const candidateIds = membershipsAtHost
      .map((m) => m.userId)
      .filter((id) => id !== caller._id);

    const filter = { _id: { $in: candidateIds } };

    const users = await Meteor.users
      .find(filter, {
        fields: {
          _id: 1,
          username: 1,
          avatar: 1,
          firstName: 1,
          lastName: 1,
        },
      })
      .fetchAsync();

    const filtered = users.filter((u) => {
      const full = `${u.firstName ?? ''} ${u.lastName ?? ''} ${
        u.username ?? ''
      }`.toLowerCase();
      return full.includes(q);
    });

    return filtered
      .map((u) => ({
        _id: u._id,
        username: u.username,
        avatar: u.avatar,
        firstName: u.firstName,
        lastName: u.lastName,
      }))
      .slice(0, 8);
  },
});
