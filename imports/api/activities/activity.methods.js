import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import dayjs from 'dayjs';

import { emailIsValid, locationSelector } from '../_utils/shared';
import { isAdmin, isContributorOrAdmin } from '../users/user.roles';
import { getSite } from '../site/site';
import Activities from './activity';
import Groups from '../groups/group';
import Memberships from '../memberships/membership';
import Resources from '../resources/resource';
import {
  getRegistrationEmailBody,
  getUnregistrationEmailBody,
} from './activity.mails';
import {
  compareDatesForSortActivities,
  compareDatesForSortActivitiesReverse,
  parseGroupActivities,
} from './activity.helpers';

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
      (user && activity.authorId === user._id)
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
  (activity.authorId === user._id || (await isAdmin(user._id)));

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
const sendConfirmation = async (to, subject, body) => {
  try {
    await Meteor.callAsync('sendEmail', to, subject, body);
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

const canManage = async (activity, user) =>
  Boolean(
    user && (activity.authorId === user._id || (await isAdmin(user._id)))
  );

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
      throw new Meteor.Error(error, "Couldn't fetch data");
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
      throw new Meteor.Error(error, "Couldn't fetch data");
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
      return await redactAttendees(activity, user);
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't fetch data");
    }
  },

  async getMyActivities() {
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      const activities = await Activities.find({
        authorId: user._id,
      }).fetchAsync();
      return activities;
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't fetch data");
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
      userIsAdmin ? { ...notArchived } : { authorId: user._id, ...notArchived },
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
            place: activity.resource || activity.place || activity.address,
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

    return {
      activityCount: activities.length,
      upcoming: upcoming.slice(0, 15),
      upcomingCount: upcoming.length,
      recentRegistrations: recentRegistrations.slice(0, 10),
      recentRegistrationCount: recentRegistrations.length,
      newMembers,
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
          authorName: username,
          ...(seesArchived ? {} : notArchived),
        }).fetchAsync(),
        user
      );
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't fetch activities");
    }
  },

  // The public events a person organizes, for their profile page.
  async getPublicActivitiesByUser(username) {
    check(username, String);
    const user = await Meteor.userAsync();
    const today = dayjs().format('YYYY-MM-DD');

    try {
      const activities = await Activities.find({
        authorName: username,
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
      throw new Meteor.Error(error, "Couldn't fetch activities");
    }
  },

  async checkDatesForConflict(
    { startDate, endDate, startTime, endTime, resourceId },
    currentActivityId = null
  ) {
    if (!resourceId) {
      return null;
    }

    const resourcesInQuestion = await Resources.find(
      {
        $or: [
          {
            _id: resourceId,
          },
          {
            'resourcesForCombo._id': resourceId,
          },
        ],
      },
      {
        fields: {
          _id: 1,
        },
      }
    ).fetchAsync();

    const resourcesIds = resourcesInQuestion.map((resource) => resource._id);

    const activityWithConflict = await Activities.findOneAsync(
      {
        _id: { $ne: currentActivityId },
        $and: [
          {
            $or: [
              {
                resourceId: {
                  $in: resourcesIds,
                },
              },
            ],
          },
          {
            $or: [
              {
                datesAndTimes: {
                  $elemMatch: {
                    startDate: {
                      $lt: endDate,
                    },
                    endDate: {
                      $gt: startDate,
                    },
                  },
                },
              },
              {
                datesAndTimes: {
                  $elemMatch: {
                    startDate: endDate,
                    startTime: { $lt: endTime },
                    endTime: { $gt: startTime },
                  },
                },
              },
              {
                datesAndTimes: {
                  $elemMatch: {
                    endDate: startDate,
                    startTime: { $lt: endTime },
                    endTime: { $gt: startTime },
                  },
                },
              },
            ],
          },
        ],
      },
      {
        fields: {
          _id: 1,
          datesAndTimes: 1,
          isExclusiveActivity: 1,
          title: 1,
        },
      }
    );

    if (!activityWithConflict) {
      return null;
    }

    return activityWithConflict;
  },

  async createActivity(values) {
    if (!values) {
      return null;
    }

    const user = await Meteor.userAsync();

    if (!user || !(await isContributorOrAdmin(user._id))) {
      throw new Meteor.Error('Not allowed!');
    }

    const images = values.images;

    if (values.isPublicActivity && (!images || images.length === 0)) {
      throw new Meteor.Error('Image is required for public activities');
    }

    const locationId = await resolveActivityLocation(values);

    try {
      const activityId = await Activities.insertAsync({
        ...values,
        locationId,
        isMunicipalityOnly: !locationId && Boolean(values.isMunicipalityOnly),
        authorId: user._id,
        authorName: user.username,
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
      return activityId;
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't add to Collection");
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

    if (user._id !== theActivity.authorId && !(await isAdmin(user._id))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }

    // Ownership fields are never client-writable.
    const { _id, authorId, authorName, isArchived, archivedAt, ...safeValues } =
      values;
    const locationId = await resolveActivityLocation({
      ...theActivity,
      ...safeValues,
    });

    try {
      return await Activities.updateAsync(activityId, {
        $set: {
          ...safeValues,
          ...(locationId ? { locationId } : {}),
          isMunicipalityOnly:
            !locationId && Boolean(safeValues.isMunicipalityOnly),
        },
        ...(locationId ? {} : { $unset: { locationId: 1 } }),
      });
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't update activity");
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

    if (user._id !== theActivity.authorId && !(await isAdmin(user._id))) {
      throw new Meteor.Error('not-authorized', 'You are not allowed');
    }

    // Deleting is a two-step thing: archive first, then delete.
    if (!theActivity.isArchived) {
      throw new Meteor.Error(
        'not-archived',
        'Archive the event before deleting it'
      );
    }

    try {
      await Activities.removeAsync(activityId);
      return true;
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't remove from collection");
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
      throw new Meteor.Error(error, "Couldn't archive activity");
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
      throw new Meteor.Error(error, "Couldn't unarchive activity");
    }
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
    if (theActivity.isRegistrationDisabled) {
      throw new Meteor.Error('registration-closed', 'Registration is closed');
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
    const hostName = site?.settings?.name;

    const field = `datesAndTimes.${occurenceIndex}.attendees`;
    const occurence = theActivity.datesAndTimes[occurenceIndex];
    const currentUser = await Meteor.userAsync();
    const emailBody = getRegistrationEmailBody(
      theActivity,
      values,
      occurence,
      site,
      currentUser
    );

    try {
      await Activities.updateAsync(activityId, {
        $push: {
          [field]: rsvpValues,
        },
      });
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't register attendance");
    }
    await sendConfirmation(
      rsvpValues.email,
      `"${theActivity.title}", ${hostName}`,
      emailBody
    );
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
    const emailBody = getRegistrationEmailBody(
      theActivity,
      rsvpValues,
      theOccurence,
      site,
      currentUser,
      true
    );

    const field = `datesAndTimes.${occurenceIndex}.attendees.${attendeeIndex}`;

    try {
      await Activities.updateAsync(activityId, {
        $set: {
          [field]: rsvpValues,
        },
      });
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't update attendance");
    }
    await sendConfirmation(
      rsvpValues.email,
      `Update to your registration for "${theActivity.title}" at ${site.settings.name}`,
      emailBody
    );
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
    const hostName = site.settings.name;

    try {
      await Activities.updateAsync(activityId, {
        $set: {
          datesAndTimes: newOccurences,
        },
      });
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't update document");
    }
    await sendConfirmation(
      email,
      `Update to your registration for "${theActivity.title}" at ${hostName}`,
      getUnregistrationEmailBody(theActivity, theNonAttendee, site, currentUser)
    );
  },
});
