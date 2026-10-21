import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { ContactPattern, requireContact } from '../_utils/contact';
import { isContributorOrAdmin } from '../users/user.roles';

// How to book a place, without booking it here: a few words about it and
// one way to book, either
//   url             a link to where it is booked, or
//   contactUserId   an organizer, whose public contact details are shown, or
//   contact         contact details of its own.
// A place without `booking` is not bookable. Booking in the calendar is the
// `bookings` feature, see imports/api/_utils/features.ts.
export const BookingPattern = Match.Maybe(
  Match.OneOf(null, {
    info: Match.Maybe(String),
    url: Match.Maybe(String),
    contactUserId: Match.Maybe(String),
    contact: ContactPattern,
  })
);

// The booking to store, or null for a place that is not bookable. Only the
// one way to book that was chosen is kept; a link or contact details that
// reach someone are required.
export async function cleanBooking(booking) {
  check(booking, BookingPattern);
  if (!booking) {
    return null;
  }
  const info = (booking.info || '').trim();
  const withInfo = info ? { info } : {};

  const url = (booking.url || '').trim();
  if (url) {
    if (/\s/.test(url)) {
      throw new Meteor.Error('invalid-url', 'The booking link is not valid');
    }
    return {
      ...withInfo,
      url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    };
  }

  if (booking.contactUserId) {
    if (!(await isContributorOrAdmin(booking.contactUserId))) {
      throw new Meteor.Error('not-found', 'No such organizer');
    }
    return { ...withInfo, contactUserId: booking.contactUserId };
  }

  if (booking.contact) {
    return { ...withInfo, contact: requireContact(booking.contact) };
  }

  throw new Meteor.Error(
    'booking-how-required',
    'A link or contact details for booking are required'
  );
}

// The organizer a place is booked through, as the place page shows them:
// name, picture and public contact details, the same as on an event page.
export async function attachBookingPerson(resource) {
  const userId = resource?.booking?.contactUserId;
  if (!userId) {
    return resource;
  }
  const user = await Meteor.users.findOneAsync(userId, {
    fields: {
      username: 1,
      firstName: 1,
      lastName: 1,
      avatar: 1,
      publicContact: 1,
    },
  });
  if (!user) {
    return resource;
  }
  return {
    ...resource,
    booking: {
      ...resource.booking,
      person: {
        _id: user._id,
        username: user.username,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        avatar: user.avatar?.src || null,
        publicContact: user.publicContact || null,
      },
    },
  };
}
