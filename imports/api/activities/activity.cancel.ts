import Activities from './activity';

/**
 * Marks an event as cancelled, or takes the mark away again. The event
 * stays where it is listed, marked, so that those planning to come see it;
 * sign-up and following close (registerAttendance, followActivity).
 *
 * Shared by the organizer's buttons (cancelActivity, uncancelActivity) and
 * by anything on the server that follows another calendar, which has no
 * user to call the methods as.
 */
export async function setActivityCancelled(
  activity: { _id: string; cancelledAt?: Date },
  { cancelled, message }: { cancelled: boolean; message?: string }
) {
  if (!cancelled) {
    await Activities.updateAsync(
      { _id: activity._id },
      { $unset: { cancelledAt: 1, cancelMessage: 1 } }
    );
    return;
  }
  const words = (message || '').trim().slice(0, 2000);
  // Cancelling again keeps the first date, and replaces the words
  const cancelledAt = activity.cancelledAt || new Date();
  await Activities.updateAsync(
    { _id: activity._id },
    words
      ? { $set: { cancelledAt, cancelMessage: words } }
      : { $set: { cancelledAt }, $unset: { cancelMessage: 1 } }
  );
}
