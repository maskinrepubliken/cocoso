import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import dayjs from 'dayjs';

import { isFeatureEnabled } from '../_utils/features';
import { locationSelector } from '../_utils/shared';
import Activities from '../activities/activity';
import Groups from '../groups/group';
import Locations from '../locations/location';
import Memberships from '../memberships/membership';
import Pages from '../pages/page';
import Resources from '../resources/resource';
import Works from '../works/work';

// The site-wide search behind the box in the header. One call, a short
// list per kind of content, only what a visitor could open anyway.

// Per section: a few in the header's results, more on the results page
const PER_KIND = 5;
const MAX_PER_KIND = 40;
const PAST_EVENTS = 3;
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

async function searchActivities(words, locationId, user, limit = PER_KIND) {
  const today = dayjs().format('YYYY-MM-DD');
  const found = await Activities.find(
    {
      $and: [
        isFeatureEnabled('groups')
          ? { $or: [{ isPublicActivity: true }, { isGroupMeeting: true }] }
          : { isPublicActivity: true, isGroupMeeting: { $ne: true } },
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
      limit: Math.max(40, limit * 3),
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

  // Upcoming soonest first, then a few of the most recent past ones; the
  // header lists the two under separate headings.
  const upcoming = visible
    .filter((activity) => activity.isUpcoming)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, limit);
  const past = visible
    .filter((activity) => !activity.isUpcoming)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, limit > PER_KIND ? limit : PAST_EVENTS);
  return [...upcoming, ...past];
}

async function searchGroups(words, locationId, user, limit = PER_KIND) {
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
      limit: Math.max(40, limit * 3),
    }
  ).fetchAsync();

  return found
    .filter((group) => canSeeGroup(group, user))
    .slice(0, limit)
    .map((group) => ({
      kind: 'groups',
      _id: group._id,
      title: group.title,
      detail: excerpt(group.readingMaterial),
      locationId: group.locationId,
    }));
}

async function searchResources(words, locationId, limit = PER_KIND) {
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
      limit,
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

async function searchWorks(words, locationId, limit = PER_KIND) {
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
      limit,
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

async function searchPages(words, limit = PER_KIND) {
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
      limit,
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
async function searchPeople(words, limit = PER_KIND) {
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
        limit,
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

// The places of the municipality, each with pages of its own.
async function searchLocations(words, limit = PER_KIND) {
  const found = await Locations.find(
    {
      $and: [
        { isPublished: true },
        wordsSelector(words, ['name', 'description']),
      ],
    },
    {
      fields: { name: 1, slug: 1, description: 1 },
      sort: { name: 1 },
      limit,
    }
  ).fetchAsync();

  return found.map((location) => ({
    kind: 'locations',
    _id: location._id,
    title: location.name,
    detail: excerpt(location.description),
    slug: location.slug,
  }));
}

Meteor.methods({
  async searchSite(query, locationId, perKind) {
    check(query, String);
    check(locationId, Match.Maybe(String));
    check(perKind, Match.Maybe(Match.Integer));
    const limit = Math.max(1, Math.min(perKind || PER_KIND, MAX_PER_KIND));

    const trimmed = query.trim().slice(0, MAX_LENGTH);
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (trimmed.length < MIN_LENGTH || words.length === 0) {
      return [];
    }

    const user = await Meteor.userAsync();

    try {
      const [activities, groups, resources, works, pages, people, locations] =
        await Promise.all([
          searchActivities(words, locationId, user, limit),
          isFeatureEnabled('groups')
            ? searchGroups(words, locationId, user, limit)
            : [],
          searchResources(words, locationId, limit),
          isFeatureEnabled('works')
            ? searchWorks(words, locationId, limit)
            : [],
          searchPages(words, limit),
          searchPeople(words, limit),
          searchLocations(words, limit),
        ]);
      return [
        ...activities,
        ...groups,
        ...resources,
        ...works,
        ...pages,
        ...people,
        ...locations,
      ];
    } catch (error) {
      throw new Meteor.Error('search-failed', "Couldn't search");
    }
  },
});
