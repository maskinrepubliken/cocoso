import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check, Match } from 'meteor/check';

import { getSite } from '../site/site';
import { publicUrl } from '../_utils/shared';
import { extractEmailAddress } from '../_utils/services/mails/mail.helpers';
import Works from '../works/work';
import Groups from '../groups/group';
import Memberships from '../memberships/membership';
import { getUserMemberships } from '../memberships/membership.helpers';
import {
  ContactPattern,
  cleanContact,
  isOrganizer,
} from '../activities/activity.organizers';
import { requireContact } from '../_utils/contact';
import { isAdmin, isContributorOrAdmin } from './user.roles';

const userModel = async (user) => ({
  _id: user._id,
  avatar: user.avatar,
  bio: user.bio,
  contactInfo: user.contactInfo,
  publicContact: user.publicContact || null,
  firstName: user.firstName,
  keywords: user.keywords,
  lastName: user.lastName,
  username: user.username,
  memberships: await getUserMemberships(user._id),
});

// Writes a user's avatar and the copies of it kept on their works and
// groups. Callers check who may do this.
async function applyAvatar(userId, avatar) {
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
  } catch (error) {
    throw new Meteor.Error(error);
  }
}

// The profile fields one may write, for oneself or (an admin) for anyone.
const ProfilePattern = {
  firstName: Match.Maybe(String),
  lastName: Match.Maybe(String),
  bio: Match.Maybe(String),
  contactInfo: Match.Maybe(String),
  publicContact: ContactPattern,
};

async function requireAdminUser() {
  const user = await Meteor.userAsync();
  if (!user || !(await isAdmin(user._id))) {
    throw new Meteor.Error('not-allowed', 'You are not allowed');
  }
  return user;
}

async function writeProfile(userId, values) {
  const { publicContact, ...rest } = values;
  const set = { ...rest };
  if ('publicContact' in values) {
    // Anyone may share contact details; organizers must.
    set.publicContact = (await isOrganizer(userId))
      ? requireContact(publicContact)
      : cleanContact(publicContact);
  }
  try {
    await Meteor.users.updateAsync(userId, { $set: set });
  } catch (error) {
    throw new Meteor.Error(error);
  }
}

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
    check(values, ProfilePattern);
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    await writeProfile(user._id, values);
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

    await applyAvatar(user._id, avatar);
  },

  // An admin editing an organizer's profile from the organizer's page:
  // the same fields the person can edit themself, nothing else.
  async getUserProfileForAdmin(username) {
    check(username, String);
    await requireAdminUser();
    const user = await Meteor.users.findOneAsync(
      { username },
      {
        fields: {
          username: 1,
          firstName: 1,
          lastName: 1,
          bio: 1,
          contactInfo: 1,
          publicContact: 1,
          avatar: 1,
        },
      }
    );
    if (!user) {
      throw new Meteor.Error('not-found', 'No such user');
    }
    return { ...user, isOrganizer: await isOrganizer(user._id) };
  },

  // Whether the profile form must insist on an email or a phone.
  async isCurrentUserOrganizer() {
    const user = await Meteor.userAsync();
    return Boolean(user && (await isOrganizer(user._id)));
  },

  async saveUserInfoAsAdmin(userId, values) {
    check(userId, String);
    check(values, ProfilePattern);
    await requireAdminUser();
    await writeProfile(userId, values);
  },

  async setAvatarAsAdmin(userId, avatar) {
    check(userId, String);
    check(avatar, String);
    await requireAdminUser();
    await applyAvatar(userId, avatar);
  },

  // Whom a contributor can name as co-organizer of an event: everyone who
  // may publish content. Only name and username leave the server.
  async getOrganizerOptions() {
    const user = await Meteor.userAsync();
    if (!user || !(await isContributorOrAdmin(user._id))) {
      throw new Meteor.Error('not-allowed', 'Not allowed');
    }
    const memberships = await Memberships.find(
      { role: { $in: ['contributor', 'admin'] } },
      { fields: { userId: 1 } }
    ).fetchAsync();
    const ids = memberships
      .map((m) => m.userId)
      .filter((id) => id !== user._id);
    const users = await Meteor.users
      .find(
        { _id: { $in: ids } },
        { fields: { username: 1, firstName: 1, lastName: 1 } }
      )
      .fetchAsync();
    return users
      .map((u) => ({
        _id: u._id,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
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
});
