import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import dayjs from 'dayjs';

import { emailIsValid, locationSelector } from '../_utils/shared';
import { isAdmin, isContributorOrAdmin } from '../users/user.roles';
import { getSite } from '../site/site';
import Activities from './activity';
import Groups from '../groups/group';
import { meetingTitleOf } from '../groups/meetingTitle';
import Memberships from '../memberships/membership';
import Resources from '../resources/resource';
import { MirrorRuns } from '../mirrors/mirror';
import { registrationEmail, unregistrationEmail } from './activity.mails';
import {
  attachOrganizerProfiles,
  cleanContact,
  isOrganizerOf,
  requireOrganizerContact,
  resolveOrganizers,
  resolveContactUserId,
} from './activity.organizers';
import { attachPlaceAddress, ownActivityAddress } from './activity.place';
import { warmShareImage } from '../share/shareImage.server';
import { formatAddress } from '../_utils/address';
import { withCoordinates } from '../_utils/geocode';
import { cleanKinds } from '../_utils/kinds';
import { EVENT_KIND_KEYS } from '../../ui/pages/activities/eventKinds';
import {
  compareDatesForSortActivities,
  compareDatesForSortActivitiesReverse,
  parseGroupActivities,
} from './activity.helpers';
import { sendEmail } from '../_utils/services/mails/mail.methods';
import { scheduleChangeNotice } from '../notifications/notify';
import { setActivityCancelled } from './activity.cancel';
import methodError from '../_utils/methodError';

const filterPrivateGroups = async (activities, user) => {
  if (!activities) {
    return [];
  }
  const filterResults = await Promise.all(
    activities.map(async (act) => {
      if (!act.isGroupPrivate) {
        return true;
      }
      if (!user) {
        return false;
      }
      const group = await Groups.findOneAsync({ _id: act.groupId });
      const userId = user?._id;
      // The site's admins see private groups' meetings too
      if (await isAdmin(userId)) {
        return true;
      }
      return (
        group.adminId === userId ||
        group.members.some((member) => member.memberId === userId) ||
        group.peopleInvited.some(
          (person) => person.email === user.emails[0].address
        )
      );
    })
  );
  return activities.filter((_, index) => filterResults[index]);
};

// Everyone may see who is coming, but only the organizer and admins see
// email addresses and the names of those who chose to hide theirs.
const redactAttendees = async (activities, user) => {
  if (!activities) {
    return activities;
  }
  const userIsAdmin = await isAdmin(user?._id);
  const redactOne = (activity) => {
    if (
      !activity?.datesAndTimes ||
      userIsAdmin ||
      (user && isOrganizerOf(activity, user._id))
    ) {
      return activity;
    }
    return {
      ...activity,
      datesAndTimes: activity.datesAndTimes.map((occurrence) => ({
        ...occurrence,
        attendees: (occurrence.attendees || []).map((attendee) =>
          attendee.isNameHidden
            ? {
                numberOfPeople: attendee.numberOfPeople,
                isNameHidden: true,
              }
            : {
                firstName: attendee.firstName,
                lastName: attendee.lastName,
                numberOfPeople: attendee.numberOfPeople,
              }
        ),
      })),
    };
  };
  return Array.isArray(activities)
    ? activities.map(redactOne)
    : redactOne(activities);
};

const canManageAttendees = async (activity, user) =>
  Boolean(user) &&
  (isOrganizerOf(activity, user._id) || (await isAdmin(user._id)));

const sameText = (a, b) =>
  (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

const findAttendeeIndex = (occurrence, email, lastName) =>
  (occurrence?.attendees || []).findIndex(
    (a) => sameText(a.email, email) && sameText(a.lastName, lastName)
  );

const attendeePattern = Match.ObjectIncluding({
  email: String,
  firstName: Match.Maybe(String),
  lastName: Match.Maybe(String),
  username: Match.Maybe(String),
  numberOfPeople: Match.Maybe(Match.OneOf(Number, String)),
  isNameHidden: Match.Maybe(Boolean),
});

const pickAttendeeValues = (values) => {
  const picked = {
    email: values.email.trim(),
    firstName: (values.firstName || '').trim(),
    lastName: (values.lastName || '').trim(),
    isNameHidden: Boolean(values.isNameHidden),
  };
  if (values.username) {
    picked.username = values.username;
  }
  return picked;
};

// A registration stands even when its confirmation email cannot be sent.
const sendConfirmation = async (to, { subject, html, text }) => {
  try {
    await sendEmail(to, subject, html, undefined, text);
  } catch (error) {
    console.error('Could not send registration email', error);
  }
};

const countPeople = (attendees, skipIndex = -1) =>
  (attendees || []).reduce(
    (sum, a, index) =>
      index === skipIndex ? sum : sum + (Number(a.numberOfPeople) || 1),
    0
  );

// The location of an activity follows its resource when it has one; only
// activities without a resource carry a location of their own.
async function resolveActivityLocation(values) {
  if (values.resourceId) {
    const resource = await Resources.findOneAsync(values.resourceId, {
      fields: { locationId: 1 },
    });
    return resource?.locationId || undefined;
  }
  return values.locationId || undefined;
}

// Archived events stay out of every listing except their organizer's own.
const notArchived = { isArchived: { $ne: true } };

// The organizer an admin names in the form: an existing contributor or
// admin, returned as the author fields. Anyone else gets the caller.
async function chooseAuthor(user, requestedId) {
  if (!requestedId || requestedId === user._id) {
    return { authorId: user._id, authorName: user.username };
  }
  if (!(await isAdmin(user._id))) {
    throw new Meteor.Error(
      'not-allowed',
      'Only an admin may name the organizer'
    );
  }
  check(requestedId, String);
  const author = await Meteor.users.findOneAsync(requestedId, {
    fields: { username: 1 },
  });
  if (!author || !(await isContributorOrAdmin(author._id))) {
    throw new Meteor.Error('not-found', 'The organizer must be an organizer');
  }
  return { authorId: author._id, authorName: author.username };
}

const canManage = async (activity, user) =>
  Boolean(
    user && (isOrganizerOf(activity, user._id) || (await isAdmin(user._id)))
  );

// Events the user organizes, as author or co-organizer.
const organizedBy = (userId) => ({
  $or: [{ authorId: userId }, { 'organizers.userId': userId }],
});
const organizedByName = (username) => ({
  $or: [{ authorName: username }, { 'organizers.username': username }],
});

Meteor.methods({
  async getAllPublicActivities(showPast = false, locationId) {
    check(locationId, Match.Maybe(String));
    const user = await Meteor.userAsync();
    const today = dayjs().format('YYYY-MM-DD');
    const visibility = {
      $or: [{ isPublicActivity: true }, { isGroupMeeting: true }],
    };
    const selector = {
      $and: [visibility, locationSelector(locationId), notArchived],
    };

    try {
      if (showPast) {
        const pastActs = await Activities.find({
          ...selector,
          'datesAndTimes.endDate': { $lte: today },
        }).fetchAsync();
        const pastActsSorted = parseGroupActivities(pastActs)?.sort(
          compareDatesForSortActivitiesReverse
        );
        return await redactAttendees(
          await filterPrivateGroups(pastActsSorted, user),
          user
        );
      }
      const futureActs = await Activities.find({
        ...selector,
        'datesAndTimes.endDate': { $gte: today },
      }).fetchAsync();

      const futureActsSorted = parseGroupActivities(futureActs)?.sort(
        compareDatesForSortActivities
      );
      return await redactAttendees(
        await filterPrivateGroups(futureActsSorted, user),
        user
      );
    } catch (error) {
      throw methodError(error, "Couldn't fetch data");
    }
  },

  async getAllActivities(locationId) {
    check(locationId, Match.Maybe(String));
    const user = await Meteor.userAsync();
    try {
      const allActs = await Activities.find({
        ...locationSelector(locationId),
        ...notArchived,
      }).fetchAsync();
      const allActsParsed = parseGroupActivities(allActs);
      return await redactAttendees(
        await filterPrivateGroups(allActsParsed, user),
        user
      );
    } catch (error) {
      throw methodError(error, "Couldn't fetch data");
    }
  },

  async getActivityById(activityId) {
    check(activityId, String);
    const user = await Meteor.userAsync();
    try {
      const activity = await Activities.findOneAsync({ _id: activityId });
      // An archived event is only there for its organizer and the admins.
      if (activity?.isArchived && !(await canManage(activity, user))) {
        return null;
      }
      return await attachPlaceAddress(
        await attachOrganizerProfiles(await redactAttendees(activity, user))
      );
    } catch (error) {
      throw methodError(error, "Couldn't fetch data");
    }
  },

  async getMyActivities() {
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      const activities = await Activities.find(
        organizedBy(user._id)
      ).fetchAsync();
      return activities;
    } catch (error) {
      throw methodError(error, "Couldn't fetch data");
    }
  },

  // The admin home: what is coming up and who signed up lately. Admins see
  // every activity, contributors only their own. Attendee emails never leave
  // the server here; the page links to the activity for the full list.
  async getHomeOverview() {
    const user = await Meteor.userAsync();
    if (!user || !(await isContributorOrAdmin(user._id))) {
      throw new Meteor.Error('not-allowed', 'Not allowed');
    }
    const userIsAdmin = await isAdmin(user._id);

    const today = dayjs().format('YYYY-MM-DD');
    const horizon = dayjs().add(14, 'day').format('YYYY-MM-DD');
    const since = dayjs().subtract(7, 'day').toDate();

    const activities = await Activities.find(
      userIsAdmin
        ? { ...notArchived }
        : { ...organizedBy(user._id), ...notArchived },
      { fields: { longDescription: 0, images: 0, imagesLegacy: 0 } }
    ).fetchAsync();

    const peopleIn = (attendees) =>
      (attendees || []).reduce(
        (sum, a) => sum + (Number(a.numberOfPeople) || 1),
        0
      );
    const nameOf = (a) =>
      [a.firstName, a.lastName].filter(Boolean).join(' ') || a.username || '';

    const upcoming = [];
    const recentRegistrations = [];

    activities.forEach((activity) => {
      (activity.datesAndTimes || []).forEach((occurrence) => {
        if (occurrence.startDate >= today && occurrence.startDate <= horizon) {
          upcoming.push({
            activityId: activity._id,
            title: activity.title,
            place:
              activity.resource ||
              activity.place ||
              formatAddress(activity.address),
            startDate: occurrence.startDate,
            startTime: occurrence.startTime,
            endTime: occurrence.endTime,
            capacity: activity.capacity,
            isRegistrationOpen:
              activity.isRegistrationEnabled !== false &&
              !activity.isRegistrationDisabled,
            people: peopleIn(occurrence.attendees),
          });
        }
        (occurrence.attendees || []).forEach((attendee) => {
          if (attendee.registerDate && attendee.registerDate >= since) {
            recentRegistrations.push({
              activityId: activity._id,
              title: activity.title,
              startDate: occurrence.startDate,
              startTime: occurrence.startTime,
              name: nameOf(attendee),
              numberOfPeople: Number(attendee.numberOfPeople) || 1,
              registerDate: attendee.registerDate,
            });
          }
        });
      });
    });

    upcoming.sort((a, b) =>
      `${a.startDate}${a.startTime}`.localeCompare(
        `${b.startDate}${b.startTime}`
      )
    );
    recentRegistrations.sort((a, b) => b.registerDate - a.registerDate);

    let newMembers = [];
    if (userIsAdmin) {
      const memberships = await Memberships.find(
        { joinDate: { $gte: dayjs().subtract(14, 'day').toDate() } },
        { sort: { joinDate: -1 }, limit: 10 }
      ).fetchAsync();
      const users = await Meteor.users
        .find(
          { _id: { $in: memberships.map((m) => m.userId) } },
          { fields: { username: 1, firstName: 1, lastName: 1 } }
        )
        .fetchAsync();
      newMembers = memberships
        .map((m) => {
          const u = users.find((each) => each._id === m.userId);
          return (
            u && {
              username: u.username,
              name: nameOf(u),
              role: m.role,
              joinDate: m.joinDate,
            }
          );
        })
        .filter(Boolean);
    }

    // Places added lately, by whom and who looks after them, so misuse of
    // organizers' right to add places is easy to spot
    let newPlaces = [];
    if (userIsAdmin) {
      const places = await Resources.find(
        { createdAt: { $gte: dayjs().subtract(14, 'day').toDate() } },
        {
          sort: { createdAt: -1 },
          limit: 10,
          fields: {
            label: 1,
            createdAt: 1,
            createdBy: 1,
            managerIds: 1,
            parentId: 1,
            isUnlisted: 1,
          },
        }
      ).fetchAsync();
      const managers = await Meteor.users
        .find(
          { _id: { $in: places.flatMap((place) => place.managerIds || []) } },
          { fields: { username: 1 } }
        )
        .fetchAsync();
      const usernameOf = (id) => managers.find((u) => u._id === id)?.username;
      newPlaces = places.map((place) => ({
        _id: place._id,
        label: place.label,
        createdAt: place.createdAt,
        createdBy: place.createdBy || null,
        managers: (place.managerIds || []).map(usernameOf).filter(Boolean),
        isPart: Boolean(place.parentId),
        isUnlisted: Boolean(place.isUnlisted),
      }));
    }

    // Events added lately by people. Those a mirror fetched are left out:
    // the mirrors' logbook below tells of them.
    let newActivities = [];
    if (userIsAdmin) {
      const added = dayjs().subtract(14, 'day').toDate();
      newActivities = activities
        .filter(
          (activity) =>
            activity.creationDate >= added &&
            (!activity.mirror || activity.mirror.isDetached)
        )
        .sort((a, b) => b.creationDate - a.creationDate)
        .map((activity) => {
          const first = (activity.datesAndTimes || [])[0];
          return {
            _id: activity._id,
            title: activity.title,
            author: activity.authorName || null,
            place:
              activity.resource ||
              activity.place ||
              formatAddress(activity.address),
            startDate: first?.startDate || null,
            startTime: first?.startTime || null,
            createdAt: activity.creationDate,
            isPublished: Boolean(activity.isPublished),
          };
        });
    }

    // The mirrors' logbook: what their runs brought, and which failed
    let mirrorRuns = [];
    if (userIsAdmin) {
      mirrorRuns = await MirrorRuns.find(
        { at: { $gte: dayjs().subtract(14, 'day').toDate() } },
        { sort: { at: -1 }, limit: 12 }
      ).fetchAsync();
    }

    return {
      activityCount: activities.length,
      upcoming: upcoming.slice(0, 15),
      upcomingCount: upcoming.length,
      recentRegistrations: recentRegistrations.slice(0, 10),
      recentRegistrationCount: recentRegistrations.length,
      newMembers,
      newActivities: newActivities.slice(0, 10),
      newActivityCount: newActivities.length,
      newPlaces,
      mirrorRuns,
    };
  },

  async getActivitiesByUser(username) {
    if (!username) {
      throw new Meteor.Error('Not allowed!');
    }

    const user = await Meteor.userAsync();
    const seesArchived =
      user && (user.username === username || (await isAdmin(user._id)));
    try {
      return await redactAttendees(
        await Activities.find({
          ...organizedByName(username),
          ...(seesArchived ? {} : notArchived),
        }).fetchAsync(),
        user
      );
    } catch (error) {
      throw methodError(error, "Couldn't fetch activities");
    }
  },

  // The public events a person organizes, for their profile page.
  // What is coming up at a place and the places in it (its rooms): the
  // public events, soonest first, for the place's page.
  async getUpcomingActivitiesAtPlace(resourceId) {
    check(resourceId, String);
    const user = await Meteor.userAsync();
    const today = dayjs().format('YYYY-MM-DD');
    const parts = await Resources.find(
      { parentId: resourceId },
      { fields: { _id: 1 } }
    ).fetchAsync();
    const activities = await Activities.find({
      resourceId: { $in: [resourceId, ...parts.map((part) => part._id)] },
      isPublicActivity: true,
      isArchived: { $ne: true },
      'datesAndTimes.endDate': { $gte: today },
    }).fetchAsync();
    const visible = await redactAttendees(
      await filterPrivateGroups(activities, user),
      user
    );
    return visible.sort(compareDatesForSortActivities).slice(0, 6);
  },

  async getPublicActivitiesByUser(username) {
    check(username, String);
    const user = await Meteor.userAsync();
    const today = dayjs().format('YYYY-MM-DD');

    try {
      const activities = await Activities.find({
        ...organizedByName(username),
        isPublicActivity: true,
      }).fetchAsync();
      const visible = await redactAttendees(
        await filterPrivateGroups(activities, user),
        user
      );
      // Archived events are listed only for the person themself and admins.
      const seesArchived = Boolean(
        user && (user.username === username || (await isAdmin(user._id)))
      );
      const live = visible.filter((a) => !a.isArchived);

      return {
        upcoming: live
          .filter((a) => a.datesAndTimes?.some((d) => d.endDate >= today))
          .sort(compareDatesForSortActivities),
        past: live
          .filter((a) => !a.datesAndTimes?.some((d) => d.endDate >= today))
          .sort(compareDatesForSortActivitiesReverse),
        archived: seesArchived
          ? visible
              .filter((a) => a.isArchived)
              .sort(compareDatesForSortActivitiesReverse)
          : [],
      };
    } catch (error) {
      throw methodError(error, "Couldn't fetch activities");
    }
  },

  async createActivity(values) {
    if (!values) {
      return null;
    }

    const user = await Meteor.userAsync();

    if (!user || !(await isContributorOrAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }
    // Whoever creates an event organizes it, unless an admin names someone
    // else; organizers can be reached.
    const author = await chooseAuthor(user, values.authorId);
    delete values.authorId;
    delete values.authorName;
    // A group's meeting is reached through the group's own contact details,
    // and is titled after the group with its own name after it
    if (!values.isGroupMeeting) {
      await requireOrganizerContact([author.authorId]);
    } else if (values.groupId) {
      const group = await Groups.findOneAsync(values.groupId, {
        fields: { title: 1 },
      });
      if (values.meetingTitle) {
        values.meetingTitle = String(values.meetingTitle).trim();
      }
      if (group) {
        values.title = meetingTitleOf(group.title, values.meetingTitle);
      }
    }

    const images = values.images;

    if (values.isPublicActivity && (!images || images.length === 0)) {
      throw new Meteor.Error(
        'image-required',
        'Image is required for public activities'
      );
    }

    if (!values.resourceId) {
      delete values.resourceId;
      delete values.resource;
    }
    // Only the known kinds; the single category is from before kinds.
    check(values.kinds, Match.Maybe([String]));
    values.kinds = cleanKinds(values.kinds, EVENT_KIND_KEYS);
    delete values.category;
    const locationId = await resolveActivityLocation(values);
    const organizers = await resolveOrganizers(
      values.organizers,
      author.authorId
    );
    const contact = cleanContact(values.contact);
    const contactUserId = resolveContactUserId(
      values.contactUserId,
      contact,
      author.authorId,
      organizers
    );
    delete values.contactUserId;
    // Held at a place: the place has the address. Otherwise its own, if any.
    const address = await withCoordinates(ownActivityAddress(values));
    delete values.address;

    try {
      const activityId = await Activities.insertAsync({
        ...values,
        organizers,
        contact,
        ...(contactUserId ? { contactUserId } : {}),
        ...(address ? { address } : {}),
        locationId,
        isMunicipalityOnly: !locationId && Boolean(values.isMunicipalityOnly),
        ...author,
        isSentForReview: false,
        isPublished: true,
        creationDate: new Date(),
      });
      if (values.isPublicActivity) {
        await Meteor.callAsync(
          'createChat',
          values.title,
          activityId,
          'activities'
        );
      }
      warmShareImage('activity', activityId);
      return activityId;
    } catch (error) {
      throw methodError(error, "Couldn't add to Collection");
    }
  },

  async updateActivity(activityId, values) {
    const user = await Meteor.userAsync();

    if (!user) {
      throw new Meteor.Error('Not allowed!');
    }

    const theActivity = await Activities.findOneAsync({
      _id: activityId,
    });

    if (!theActivity) {
      throw new Meteor.Error('not-found', 'Activity not found');
    }

    if (!(await canManage(theActivity, user))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }

    // Ownership fields are not client-writable, except that an admin may
    // hand the event to another organizer.
    const {
      _id,
      authorId,
      authorName,
      isArchived,
      archivedAt,
      // Set only by cancelActivity and uncancelActivity
      cancelledAt,
      cancelMessage,
      // Set only by a mirror, and detachMirroredActivity
      mirror,
      // Not stored: whether to tell those signed up and following, and
      // the organizer's words to them (asked when saving in the form)
      notify,
      ...safeValues
    } = values;
    check(notify, Match.Maybe({ send: Boolean, message: Match.Maybe(String) }));
    let newAuthor = null;
    if (authorId && authorId !== theActivity.authorId) {
      // Only an admin hands an event over, also to themself: a
      // co-organizer must not make themself the organizer.
      if (!(await isAdmin(user._id))) {
        throw new Meteor.Error(
          'not-allowed',
          'Only an admin may change the organizer'
        );
      }
      newAuthor = await chooseAuthor(user, authorId);
      await requireOrganizerContact([newAuthor.authorId]);
    }
    const effectiveAuthorId = newAuthor?.authorId || theActivity.authorId;
    const locationId = await resolveActivityLocation({
      ...theActivity,
      ...safeValues,
    });
    if ('organizers' in safeValues) {
      safeValues.organizers = await resolveOrganizers(
        safeValues.organizers,
        effectiveAuthorId
      );
    }
    if ('contact' in safeValues) {
      safeValues.contact = cleanContact(safeValues.contact);
    }
    // A place chosen away is removed, not kept from before.
    const unset = {};
    // Only the known kinds; they replace the single category from before.
    delete safeValues.category;
    if ('kinds' in safeValues) {
      check(safeValues.kinds, Match.Maybe([String]));
      safeValues.kinds = cleanKinds(safeValues.kinds, EVENT_KIND_KEYS);
      unset.category = 1;
    }
    if (
      'contact' in safeValues ||
      'contactUserId' in safeValues ||
      'organizers' in safeValues ||
      newAuthor
    ) {
      const contactUserId = resolveContactUserId(
        'contactUserId' in safeValues
          ? safeValues.contactUserId
          : theActivity.contactUserId,
        'contact' in safeValues ? safeValues.contact : theActivity.contact,
        effectiveAuthorId,
        'organizers' in safeValues
          ? safeValues.organizers
          : theActivity.organizers
      );
      delete safeValues.contactUserId;
      if (contactUserId) {
        safeValues.contactUserId = contactUserId;
      } else {
        unset.contactUserId = 1;
      }
    }
    // The event's own address only counts when it is not held at a place.
    if ('address' in safeValues || 'resourceId' in safeValues) {
      const address = await withCoordinates(
        ownActivityAddress({
          resourceId:
            'resourceId' in safeValues
              ? safeValues.resourceId
              : theActivity.resourceId,
          address:
            'address' in safeValues ? safeValues.address : theActivity.address,
        })
      );
      delete safeValues.address;
      if (address) {
        safeValues.address = address;
      } else {
        unset.address = 1;
      }
    }
    if ('resourceId' in safeValues && !safeValues.resourceId) {
      delete safeValues.resourceId;
      delete safeValues.resource;
      unset.resourceId = 1;
      unset.resource = 1;
    }
    if (!locationId) {
      unset.locationId = 1;
    }

    try {
      const updated = await Activities.updateAsync(activityId, {
        $set: {
          ...safeValues,
          ...(newAuthor || {}),
          ...(locationId ? { locationId } : {}),
          isMunicipalityOnly:
            !locationId && Boolean(safeValues.isMunicipalityOnly),
          // og:updated_time / article:modified_time on the event page
          latestUpdate: new Date(),
        },
        ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
      });
      warmShareImage('activity', activityId);
      // Those signed up and following are told a few minutes after saving
      // (imports/api/notifications/notify.ts): of a new time or place, and
      // the organizer's words if any. The form asks the organizer first
      // (`notify`); without an answer, as from the calendar, a new time or
      // place is told anyway.
      if (
        theActivity.isPublicActivity &&
        theActivity.isPublished &&
        notify?.send !== false
      ) {
        // The event is saved either way; a notice that can't be queued is
        // logged, not reported as a failed save
        scheduleChangeNotice(theActivity, {
          message: (notify?.message || '').trim().slice(0, 2000),
          editorId: user._id,
        }).catch((error) =>
          console.error('[updateActivity] notice not queued', error)
        );
      }
      return updated;
    } catch (error) {
      // A Meteor.Error with an Error object as its code can't be sent and
      // crashes the server; send the reason as text
      console.error('[updateActivity]', error);
      throw new Meteor.Error(
        'update-failed',
        error?.reason || error?.message || "Couldn't update activity"
      );
    }
  },

  async deleteActivity(activityId) {
    const user = await Meteor.userAsync();

    if (!user) {
      throw new Meteor.Error('Not allowed!');
    }

    const theActivity = await Activities.findOneAsync({
      _id: activityId,
    });

    if (!theActivity) {
      throw new Meteor.Error('not-found', 'Activity not found');
    }

    const userIsAdmin = await isAdmin(user._id);
    // A group's meeting may also go by the hand of the group's admins
    const group = theActivity.isGroupMeeting
      ? await Groups.findOneAsync(theActivity.groupId, {
          fields: { members: 1 },
        })
      : null;
    const isGroupsAdmin = Boolean(
      group?.members?.some((m) => m.memberId === user._id && m.isAdmin)
    );
    if (user._id !== theActivity.authorId && !userIsAdmin && !isGroupsAdmin) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }

    // Deleting a public event is a two-step thing for its organizer:
    // archive first, then delete. Admins may delete straight away, and a
    // group's own meeting is removed from the group page directly.
    if (
      !theActivity.isArchived &&
      !theActivity.isGroupMeeting &&
      !userIsAdmin
    ) {
      throw new Meteor.Error(
        'not-archived',
        'Archive the event before deleting it'
      );
    }

    try {
      await Activities.removeAsync(activityId);
      return true;
    } catch (error) {
      throw methodError(error, "Couldn't remove from collection");
    }
  },

  // The organizer or an admin takes the event out of every listing. It stays
  // reachable for them (and on their profile under "archived") and can be
  // brought back, or deleted for good.
  async archiveActivity(activityId) {
    check(activityId, String);
    const user = await Meteor.userAsync();
    const theActivity = await Activities.findOneAsync({ _id: activityId });
    if (!theActivity) {
      throw new Meteor.Error('not-found', 'Activity not found');
    }
    if (!(await canManage(theActivity, user))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    try {
      await Activities.updateAsync(
        { _id: activityId },
        { $set: { isArchived: true, archivedAt: new Date() } }
      );
      return true;
    } catch (error) {
      throw methodError(error, "Couldn't archive activity");
    }
  },

  async unarchiveActivity(activityId) {
    check(activityId, String);
    const user = await Meteor.userAsync();
    const theActivity = await Activities.findOneAsync({ _id: activityId });
    if (!theActivity) {
      throw new Meteor.Error('not-found', 'Activity not found');
    }
    if (!(await canManage(theActivity, user))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    try {
      await Activities.updateAsync(
        { _id: activityId },
        { $set: { isArchived: false }, $unset: { archivedAt: 1 } }
      );
      return true;
    } catch (error) {
      throw methodError(error, "Couldn't unarchive activity");
    }
  },

  // The organizer or an admin calls the event off. It stays listed, marked
  // as cancelled with their words if any, until its date has passed.
  async cancelActivity(activityId, message) {
    check(activityId, String);
    check(message, Match.Maybe(String));
    const user = await Meteor.userAsync();
    const theActivity = await Activities.findOneAsync({ _id: activityId });
    if (!theActivity) {
      throw new Meteor.Error('not-found', 'Activity not found');
    }
    if (!(await canManage(theActivity, user))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    await setActivityCancelled(theActivity, {
      cancelled: true,
      message,
      editorId: user._id,
    });
    return true;
  },

  async uncancelActivity(activityId) {
    check(activityId, String);
    const user = await Meteor.userAsync();
    const theActivity = await Activities.findOneAsync({ _id: activityId });
    if (!theActivity) {
      throw new Meteor.Error('not-found', 'Activity not found');
    }
    if (!(await canManage(theActivity, user))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    await setActivityCancelled(theActivity, {
      cancelled: false,
      editorId: user._id,
    });
    return true;
  },

  // A mirrored event (imports/api/mirrors) becomes the organizer's own: the
  // mirror leaves it alone from now on, and edits to it stay.
  async detachMirroredActivity(activityId) {
    check(activityId, String);
    const user = await Meteor.userAsync();
    const theActivity = await Activities.findOneAsync({ _id: activityId });
    if (!theActivity?.mirror) {
      throw new Meteor.Error('not-found', 'Mirrored activity not found');
    }
    if (!(await canManage(theActivity, user))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }
    await Activities.updateAsync(
      { _id: activityId },
      { $set: { 'mirror.isDetached': true } }
    );
    return true;
  },

  async registerAttendance(activityId, values, occurenceIndex = 0) {
    check(activityId, String);
    check(occurenceIndex, Match.Integer);
    check(values, attendeePattern);
    if (!emailIsValid(values.email)) {
      throw new Meteor.Error('invalid-email', 'Please enter a valid email');
    }

    const theActivity = await Activities.findOneAsync({
      _id: activityId,
    });
    if (!theActivity || !theActivity.datesAndTimes?.[occurenceIndex]) {
      throw new Meteor.Error('not-found', 'Activity or occurrence not found');
    }
    if (
      theActivity.isRegistrationDisabled ||
      theActivity.isRegistrationEnabled === false
    ) {
      throw new Meteor.Error('registration-closed', 'Registration is closed');
    }
    if (theActivity.cancelledAt) {
      throw new Meteor.Error('cancelled', 'The event is cancelled');
    }
    const theOccurrence = theActivity.datesAndTimes[occurenceIndex];
    if (findAttendeeIndex(theOccurrence, values.email, values.lastName) > -1) {
      throw new Meteor.Error('already-registered', 'Already registered');
    }
    const numberOfPeople = Number(values.numberOfPeople) || 1;
    if (
      !theActivity.isGroupMeeting &&
      theActivity.capacity &&
      countPeople(theOccurrence.attendees) + numberOfPeople >
        theActivity.capacity
    ) {
      throw new Meteor.Error('capacity-full', 'Not enough places left');
    }
    const rsvpValues = {
      ...pickAttendeeValues(values),
      numberOfPeople,
      registerDate: new Date(),
    };

    const site = await getSite();

    const field = `datesAndTimes.${occurenceIndex}.attendees`;
    const occurence = theActivity.datesAndTimes[occurenceIndex];
    const currentUser = await Meteor.userAsync();
    const email = registrationEmail({
      activity: await attachPlaceAddress(theActivity),
      values: rsvpValues,
      occurrence: occurence,
      site,
      currentUser,
    });

    try {
      await Activities.updateAsync(activityId, {
        $push: {
          [field]: rsvpValues,
        },
      });
    } catch (error) {
      throw methodError(error, "Couldn't register attendance");
    }
    await sendConfirmation(rsvpValues.email, email);
  },

  // The registration is identified by the email and last name it was made
  // with (`current`), which only its owner knows, unless the organizer or an
  // admin makes the change.
  async updateAttendance(
    activityId,
    values,
    occurenceIndex,
    attendeeIndex,
    current
  ) {
    check(activityId, String);
    check(occurenceIndex, Match.Integer);
    check(attendeeIndex, Match.Integer);
    check(values, attendeePattern);
    check(
      current,
      Match.Maybe({ email: String, lastName: Match.Maybe(String) })
    );
    if (!emailIsValid(values.email)) {
      throw new Meteor.Error('invalid-email', 'Please enter a valid email');
    }

    const theActivity = await Activities.findOneAsync({
      _id: activityId,
    });
    if (
      !theActivity?.datesAndTimes?.[occurenceIndex]?.attendees?.[attendeeIndex]
    ) {
      throw new Meteor.Error('not-found', 'Registration not found');
    }
    const existing =
      theActivity.datesAndTimes[occurenceIndex].attendees[attendeeIndex];
    const currentUser = await Meteor.userAsync();
    const isOwner =
      current &&
      sameText(existing.email, current.email) &&
      sameText(existing.lastName, current.lastName);
    if (!isOwner && !(await canManageAttendees(theActivity, currentUser))) {
      throw new Meteor.Error('not-allowed', 'Registration not found');
    }
    const numberOfPeople = Number(values.numberOfPeople) || 1;
    if (
      !theActivity.isGroupMeeting &&
      theActivity.capacity &&
      countPeople(
        theActivity.datesAndTimes[occurenceIndex].attendees,
        attendeeIndex
      ) +
        numberOfPeople >
        theActivity.capacity
    ) {
      throw new Meteor.Error('capacity-full', 'Not enough places left');
    }
    const rsvpValues = {
      ...pickAttendeeValues(values),
      numberOfPeople,
      registerDate: new Date(),
    };
    const newDatesAndTimes = [...theActivity.datesAndTimes];
    const theOccurence = newDatesAndTimes[occurenceIndex];

    const site = await getSite();
    const email = registrationEmail({
      activity: await attachPlaceAddress(theActivity),
      values: rsvpValues,
      occurrence: theOccurence,
      site,
      currentUser,
      isUpdate: true,
    });

    const field = `datesAndTimes.${occurenceIndex}.attendees.${attendeeIndex}`;

    try {
      await Activities.updateAsync(activityId, {
        $set: {
          [field]: rsvpValues,
        },
      });
    } catch (error) {
      throw methodError(error, "Couldn't update attendance");
    }
    await sendConfirmation(rsvpValues.email, email);
  },

  // Looks up one's own registration for changing or cancelling it.
  async findAttendance(activityId, occurenceIndex, email, lastName) {
    check(activityId, String);
    check(occurenceIndex, Match.Integer);
    check(email, String);
    check(lastName, String);

    const theActivity = await Activities.findOneAsync({ _id: activityId });
    const theOccurrence = theActivity?.datesAndTimes?.[occurenceIndex];
    const attendeeIndex = findAttendeeIndex(theOccurrence, email, lastName);
    if (attendeeIndex < 0) {
      throw new Meteor.Error('not-found', 'Registration not found');
    }
    const attendee = theOccurrence.attendees[attendeeIndex];
    return {
      attendeeIndex,
      email: attendee.email,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      numberOfPeople: attendee.numberOfPeople,
      isNameHidden: Boolean(attendee.isNameHidden),
    };
  },

  async removeAttendance(activityId, occurenceIndex, email, lastName) {
    check(activityId, String);
    check(occurenceIndex, Match.Integer);
    check(email, String);
    check(lastName, Match.Maybe(String));

    const currentUser = await Meteor.userAsync();
    const theActivity = await Activities.findOneAsync({
      _id: activityId,
    });
    if (!theActivity?.datesAndTimes?.[occurenceIndex]) {
      throw new Meteor.Error('not-found', 'Activity or occurrence not found');
    }
    const newOccurences = [...theActivity.datesAndTimes];
    const theOccurence = newOccurences[occurenceIndex];
    const theNonAttendee = theOccurence.attendees?.find(
      (a) =>
        sameText(a.email, email) &&
        (theActivity.isGroupMeeting || sameText(a.lastName, lastName))
    );
    if (!theNonAttendee) {
      throw new Meteor.Error('not-found', 'Registration not found');
    }

    newOccurences[occurenceIndex].attendees = theOccurence.attendees.filter(
      (a) => {
        if (theActivity.isGroupMeeting) {
          return !sameText(email, a.email);
        }
        return !sameText(a.email, email) || !sameText(a.lastName, lastName);
      }
    );

    const site = await getSite();

    try {
      await Activities.updateAsync(activityId, {
        $set: {
          datesAndTimes: newOccurences,
        },
      });
    } catch (error) {
      throw methodError(error, "Couldn't update document");
    }
    await sendConfirmation(
      email,
      unregistrationEmail({
        activity: await attachPlaceAddress(theActivity),
        values: theNonAttendee,
        occurrence: theOccurence,
        site,
        currentUser,
      })
    );
  },
});
