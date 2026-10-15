import Resources from '../resources/resource';
import { cleanAddress, formatAddress } from '../_utils/address';

// Where an event happens. A place (resource) comes first: it is a bookmark
// for an address, so an event held there has the place's address and
// follows it if it is corrected. Only an event without a place keeps an
// address of its own.

export const resolveActivityAddress = async (activity) => {
  if (!activity) {
    return null;
  }
  if (activity.resourceId) {
    const resource = await Resources.findOneAsync(
      { _id: activity.resourceId },
      { fields: { address: 1 } }
    );
    if (resource?.address) {
      return resource.address;
    }
  }
  return activity.address && typeof activity.address === 'object'
    ? activity.address
    : null;
};

// The activity with `placeAddress`: the address to show, from its place or
// its own.
export const attachPlaceAddress = async (activity) =>
  activity
    ? { ...activity, placeAddress: await resolveActivityAddress(activity) }
    : activity;

// One line for emails and lists: "Tranemo bibliotek, Willéns väg 5, 514 33
// Tranemo".
export const describeActivityPlace = (activity, address) =>
  [activity?.resource || activity?.place, formatAddress(address)]
    .filter(Boolean)
    .join(', ');

// The address an event may store itself: none when it is held at a place,
// otherwise the cleaned one, or null.
export const ownActivityAddress = (values) =>
  values?.resourceId ? null : cleanAddress(values?.address);
