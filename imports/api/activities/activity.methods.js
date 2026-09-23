import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import dayjs from 'dayjs';

import { emailIsValid, locationSelector } from '../_utils/shared';
import { isAdmin, isContributorOrAdmin } from '../users/user.roles';
import { getSite } from '../site/site';
import Activities from './activity';
import Groups from '../groups/group';
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

Meteor.methods({
  async getAllPublicActivities(showPast = false, locationId) {
    check(locationId, Match.Maybe(String));
    const user = await Meteor.userAsync();
    const today = dayjs().format('YYYY-MM-DD');
    const visibility = {
      $or: [{ isPublicActivity: true }, { isGroupMeeting: true }],
    };
    const selector = { $and: [visibility, locationSelector(locationId)] };

    try {
      if (showPast) {
        const pastActs = await Activities.find({
          ...selector,
          'datesAndTimes.endDate': { $lte: today },
        }).fetchAsync();
        const pastActsSorted = parseGroupActivities(pastActs)?.sort(
          compareDatesForSortActivitiesReverse
        );
        return await filterPrivateGroups(pastActsSorted, user);
      }
      const futureActs = await Activities.find({
        ...selector,
        'datesAndTimes.endDate': { $gte: today },
      }).fetchAsync();

      const futureActsSorted = parseGroupActivities(futureActs)?.sort(
        compareDatesForSortActivities
      );
      return await filterPrivateGroups(futureActsSorted, user);
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't fetch data");
    }
  },

  async getAllActivities(locationId) {
    check(locationId, Match.Maybe(String));
    const user = await Meteor.userAsync();
    try {
      const allActs = await Activities.find(
        locationSelector(locationId)
      ).fetchAsync();
      const allActsParsed = parseGroupActivities(allActs);
      return await filterPrivateGroups(allActsParsed, user);
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't fetch data");
    }
  },

  async getActivityById(activityId) {
    try {
      return await Activities.findOneAsync({ _id: activityId });
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

  async getActivitiesByUser(username) {
    if (!username) {
      throw new Meteor.Error('Not allowed!');
    }

    try {
      return await Activities.find({
        authorName: username,
      }).fetchAsync();
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
    const { _id, authorId, authorName, ...safeValues } = values;
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

    try {
      await Activities.removeAsync(activityId);
      return true;
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't remove from collection");
    }
  },

  async registerAttendance(activityId, values, occurenceIndex = 0) {
    check(activityId, String);
    check(occurenceIndex, Match.Integer);
    check(values, Match.ObjectIncluding({ email: String }));
    if (!emailIsValid(values.email)) {
      throw new Meteor.Error('invalid-email', 'Please enter a valid email');
    }

    const theActivity = await Activities.findOneAsync({
      _id: activityId,
    });
    if (!theActivity || !theActivity.datesAndTimes?.[occurenceIndex]) {
      throw new Meteor.Error('not-found', 'Activity or occurrence not found');
    }
    const rsvpValues = {
      ...values,
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
      await Meteor.callAsync(
        'sendEmail',
        values.email,
        `"${theActivity.title}", ${hostName}`,
        emailBody
      );
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't register attendance");
    }
  },

  async updateAttendance(activityId, values, occurenceIndex, attendeeIndex) {
    check(activityId, String);
    check(occurenceIndex, Match.Integer);
    check(attendeeIndex, Match.Integer);
    check(values, Match.ObjectIncluding({ email: String }));
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
    const rsvpValues = {
      ...values,
      registerDate: new Date(),
    };
    const newDatesAndTimes = [...theActivity.datesAndTimes];
    const theOccurence = newDatesAndTimes[occurenceIndex];

    const site = await getSite();
    const currentUser = await Meteor.userAsync();
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
      await Meteor.callAsync(
        'sendEmail',
        values.email,
        `Update to your registration for "${theActivity.title}" at ${site.settings.name}`,
        emailBody
      );
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't update attendance");
    }
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
      (a) => a.email === email
    );
    if (!theNonAttendee) {
      throw new Meteor.Error('not-found', 'Registration not found');
    }

    newOccurences[occurenceIndex].attendees = theOccurence.attendees.filter(
      (a) => {
        if (theActivity.isGroupMeeting) {
          return email !== a.email;
        }
        return a.email !== email || a.lastName !== lastName;
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
      await Meteor.callAsync(
        'sendEmail',
        email,
        `Update to your registration for "${theActivity.title}" at ${hostName}`,
        getUnregistrationEmailBody(
          theActivity,
          theNonAttendee,
          site,
          currentUser
        )
      );
    } catch (error) {
      throw new Meteor.Error(error, "Couldn't update document");
    }
  },
});
