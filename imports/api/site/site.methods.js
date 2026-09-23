import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import Site, { getSite, sitePublicFields } from './site';
import Pages from '../pages/page';
import {
  defaultEmails,
  defaultMenu,
  defaultTheme,
} from '../../startup/constants';
import { isAdmin } from '../users/user.roles';
import Memberships from '../memberships/membership';
import { attachMembershipsToUsers } from '../memberships/membership.helpers';

function getUsersRandomlyWithAvatarsFirst(users) {
  if (!users || users.length === 0) {
    return [];
  }
  const usersWithImage = users.filter((u) => u.avatar && u.avatar.src);
  const usersWithoutImage = users.filter((u) => !u.avatar || !u.avatar.src);

  return [
    ...usersWithImage.sort(() => Math.random() - 0.5),
    ...usersWithoutImage.sort(() => Math.random() - 0.5),
  ];
}

const publicUserFields = {
  _id: 1,
  avatar: 1,
  bio: 1,
  contactInfo: 1,
  firstName: 1,
  isPublic: 1,
  keywords: 1,
  lastName: 1,
  username: 1,
};

async function requireAdmin() {
  const user = await Meteor.userAsync();
  if (!user || !(await isAdmin(user._id))) {
    throw new Meteor.Error('not-allowed', 'You are not allowed');
  }
  return user;
}

Meteor.methods({
  // Bootstraps the site. Only callable from the setup wizard, i.e. while no
  // site exists yet; the caller becomes its first admin.
  async createSite(values) {
    const currentUser = await Meteor.userAsync();
    if (!currentUser) {
      throw new Meteor.Error('not-allowed', 'You are not allowed');
    }

    if (await getSite()) {
      throw new Meteor.Error('site-exists', 'The site is already set up');
    }

    try {
      await Site.insertAsync({
        emails: defaultEmails,
        settings: {
          name: values.name,
          email: values.email,
          address: values.address,
          city: values.city,
          country: values.country,
          menu: defaultMenu,
          lang: 'sv',
          hue: Math.ceil(Math.random() * 360).toString(),
        },
        theme: defaultTheme,
        createdAt: new Date(),
      });

      await Pages.insertAsync({
        authorId: currentUser._id,
        authorName: currentUser.username,
        title: `About ${values.name}`,
        longDescription: values.about,
        isPublished: true,
        order: 1,
        creationDate: new Date(),
      });

      await Memberships.insertAsync({
        userId: currentUser._id,
        role: 'admin',
        joinDate: new Date(),
        isPublic: true,
      });
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async getSite() {
    return await getSite(sitePublicFields);
  },

  async getSiteMembersForAdmin() {
    await requireAdmin();

    const memberships = await Memberships.find({}).fetchAsync();
    const userIds = memberships.map((m) => m.userId);
    const users = await Meteor.users
      .find(
        { _id: { $in: userIds } },
        { fields: { username: 1, emails: 1, avatar: 1 } }
      )
      .fetchAsync();
    const userById = Object.fromEntries(users.map((u) => [u._id, u]));

    return memberships.map((m) => {
      const user = userById[m.userId];
      return {
        id: m.userId,
        username: user?.username,
        email: user?.emails?.[0]?.address,
        avatar: user?.avatar?.src,
        role: m.role,
        joinDate: m.joinDate,
        isPublic: m.isPublic,
        isOrganizer: Boolean(m.isOrganizer),
      };
    });
  },

  // The public people listing shows only organizers.
  async getSiteMembers() {
    const memberships = await Memberships.find(
      { isPublic: true, isOrganizer: true },
      { fields: { userId: 1 } }
    ).fetchAsync();
    const userIds = memberships.map((m) => m.userId);

    const users = await Meteor.users
      .find({ _id: { $in: userIds } }, { fields: publicUserFields })
      .fetchAsync();

    const usersWithMemberships = await attachMembershipsToUsers(users);

    return getUsersRandomlyWithAvatarsFirst(usersWithMemberships);
  },

  async updateSiteSettings(newSettings) {
    check(newSettings, Object);
    await requireAdmin();
    const site = await getSite();

    try {
      await Site.updateAsync(site._id, {
        $set: {
          settings: { ...site.settings, ...newSettings },
        },
      });
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async updateSiteTheme(theme) {
    check(theme, Object);
    await requireAdmin();
    const site = await getSite();

    try {
      await Site.updateAsync(site._id, { $set: { theme } });
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async assignSiteLogo(image, imagePng) {
    check(image, String);
    await requireAdmin();
    const site = await getSite();

    try {
      await Site.updateAsync(site._id, {
        $set: {
          logo: image,
          ...(imagePng ? { logoPng: imagePng } : {}),
        },
      });
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },

  async getEmails() {
    await requireAdmin();
    const site = await getSite();
    return site?.emails;
  },

  async updateEmail(email, emailIndex) {
    check(emailIndex, Number);
    await requireAdmin();
    const site = await getSite();

    const newEmails = [...site.emails];
    newEmails[emailIndex] = email;

    try {
      await Site.updateAsync(site._id, { $set: { emails: newEmails } });
    } catch (error) {
      throw new Meteor.Error(error);
    }
  },
});
