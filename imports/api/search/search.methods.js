import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import dayjs from 'dayjs';

import { locationSelector } from '../_utils/shared';
import Activities from '../activities/activity';
import Groups from '../groups/group';
import Memberships from '../memberships/membership';
import Pages from '../pages/page';
import Resources from '../resources/resource';
import Works from '../works/work';

// The site-wide search behind the box in the header. One call, a short
// list per kind of content, only what a visitor could open anyway.

const PER_KIND = 5;
const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every word of the query has to appear in at least one of the fields.
const wordsSelector = (words, fields) => ({
  $and: words.map((word) => ({
    $or: fields.map((field) => ({
      [field]: { $regex: escapeRegex(word), $options: 'i' },
    })),
  })),
});

const stripHtml = (html) =>
  (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const excerpt = (text, length = 90) => {
  const plain = stripHtml(text);
  return plain.length > length ? `${plain.slice(0, length).trim()}…` : plain;
};

const canSeeGroup = (group, user) => {
  if (!group.isPrivate) {
    return true;
  }
  if (!user) {
    return false;
  }
  const userId = user._id;
  const email = user.emails?.[0]?.address;
  return (
    group.adminId === userId ||
    (group.members || []).some((member) => member.memberId === userId) ||
    (group.peopleInvited || []).some((person) => person.email === email)
  );
};

async function searchActivities(words, locationId, user) {
  const today = dayjs().format('YYYY-MM-DD');
  const found = await Activities.find(
    {
      $and: [
        { $or: [{ isPublicActivity: true }, { isGroupMeeting: true }] },
        locationSelector(locationId),
        { isArchived: { $ne: true } },
        wordsSelector(words, ['title', 'subTitle', 'longDescription']),
      ],
    },
    {
      fields: {
        title: 1,
        subTitle: 1,
        datesAndTimes: 1,
        isGroupMeeting: 1,
        isGroupPrivate: 1,
        groupId: 1,
        locationId: 1,
      },
      limit: 40,
    }
  ).fetchAsync();

  const visible = [];
  for (const activity of found) {
    if (activity.isGroupPrivate) {
      // eslint-disable-next-line no-await-in-loop
      const group = await Groups.findOneAsync(
        { _id: activity.groupId },
        { fields: { isPrivate: 1, adminId: 1, members: 1, peopleInvited: 1 } }
      );
      if (!group || !canSeeGroup(group, user)) {
        continue;
      }
    }
    const dates = (activity.datesAndTimes || [])
      .map((occurrence) => occurrence.startDate)
      .filter(Boolean)
      .sort();
    const next = dates.find((date) => date >= today);
    visible.push({
      kind: 'activities',
      _id: activity._id,
      title: activity.title,
      detail: activity.subTitle || '',
      date: next || dates[dates.length - 1] || null,
      isUpcoming: Boolean(next),
      isGroupMeeting: Boolean(activity.isGroupMeeting),
      groupId: activity.groupId,
      locationId: activity.locationId,
    });
  }

  // Upcoming first, soonest first; then the most recent of the past.
  return visible
    .sort((a, b) => {
      if (a.isUpcoming !== b.isUpcoming) {
        return a.isUpcoming ? -1 : 1;
      }
      return a.isUpcoming
        ? (a.date || '').localeCompare(b.date || '')
        : (b.date || '').localeCompare(a.date || '');
    })
    .slice(0, PER_KIND);
}

async function searchGroups(words, locationId, user) {
  const found = await Groups.find(
    {
      $and: [
        locationSelector(locationId),
        { isArchived: { $ne: true } },
        wordsSelector(words, ['title', 'readingMaterial', 'description']),
      ],
    },
    {
      fields: {
        title: 1,
        readingMaterial: 1,
        isPrivate: 1,
        adminId: 1,
        members: 1,
        peopleInvited: 1,
        locationId: 1,
      },
      sort: { creationDate: -1 },
      limit: 40,
    }
  ).fetchAsync();

  return found
    .filter((group) => canSeeGroup(group, user))
    .slice(0, PER_KIND)
    .map((group) => ({
      kind: 'groups',
      _id: group._id,
      title: group.title,
      detail: excerpt(group.readingMaterial),
      locationId: group.locationId,
    }));
}

async function searchResources(words, locationId) {
  const found = await Resources.find(
    {
      $and: [
        locationSelector(locationId),
        wordsSelector(words, ['label', 'description']),
      ],
    },
    {
      fields: { label: 1, description: 1, locationId: 1 },
      sort: { createdAt: -1 },
      limit: PER_KIND,
    }
  ).fetchAsync();

  return found.map((resource) => ({
    kind: 'resources',
    _id: resource._id,
    title: resource.label,
    detail: excerpt(resource.description),
    locationId: resource.locationId,
  }));
}

async function searchWorks(words, locationId) {
  const found = await Works.find(
    {
      $and: [
        locationSelector(locationId),
        wordsSelector(words, [
          'title',
          'shortDescription',
          'longDescription',
          'category.label',
        ]),
      ],
    },
    {
      fields: {
        title: 1,
        shortDescription: 1,
        authorUsername: 1,
        'category.label': 1,
        locationId: 1,
      },
      sort: { creationDate: -1 },
      limit: PER_KIND,
    }
  ).fetchAsync();

  return found.map((work) => ({
    kind: 'works',
    _id: work._id,
    title: work.title,
    detail: work.category?.label || excerpt(work.shortDescription),
    authorUsername: work.authorUsername,
    locationId: work.locationId,
  }));
}

async function searchPages(words) {
  const found = await Pages.find(
    {
      $and: [
        { isPublished: { $ne: false } },
        wordsSelector(words, ['title', 'longDescription']),
      ],
    },
    {
      fields: { title: 1, longDescription: 1 },
      sort: { order: 1 },
      limit: PER_KIND,
    }
  ).fetchAsync();

  return found.map((page) => ({
    kind: 'info',
    _id: page._id,
    title: page.title,
    detail: excerpt(page.longDescription),
  }));
}

// Only the organizers listed on /people, matched on name and username.
async function searchPeople(words) {
  const memberships = await Memberships.find(
    { isPublic: true, isOrganizer: true },
    { fields: { userId: 1 } }
  ).fetchAsync();
  const userIds = memberships.map((membership) => membership.userId);
  if (userIds.length === 0) {
    return [];
  }

  const found = await Meteor.users
    .find(
      {
        $and: [
          { _id: { $in: userIds } },
          wordsSelector(words, ['username', 'firstName', 'lastName']),
        ],
      },
      {
        fields: { username: 1, firstName: 1, lastName: 1, avatar: 1 },
        limit: PER_KIND,
      }
    )
    .fetchAsync();

  return found.map((user) => ({
    kind: 'people',
    _id: user._id,
    title:
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username,
    detail: `@${user.username}`,
    username: user.username,
    avatar: user.avatar?.src || null,
  }));
}

Meteor.methods({
  async searchSite(query, locationId) {
    check(query, String);
    check(locationId, Match.Maybe(String));

    const trimmed = query.trim().slice(0, MAX_LENGTH);
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (trimmed.length < MIN_LENGTH || words.length === 0) {
      return [];
    }

    const user = await Meteor.userAsync();

    try {
      const [activities, groups, resources, works, pages, people] =
        await Promise.all([
          searchActivities(words, locationId, user),
          searchGroups(words, locationId, user),
          searchResources(words, locationId),
          searchWorks(words, locationId),
          searchPages(words),
          searchPeople(words),
        ]);
      return [
        ...activities,
        ...groups,
        ...resources,
        ...works,
        ...pages,
        ...people,
      ];
    } catch (error) {
      throw new Meteor.Error('search-failed', "Couldn't search");
    }
  },
});
