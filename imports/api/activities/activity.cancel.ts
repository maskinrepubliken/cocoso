import Activities from './activity';
import { scheduleCancelNotice } from '../notifications/notify';

/**
 * Marks an event as cancelled, or takes the mark away again. The event
 * stays where it is listed, marked, so that those planning to come see it;
 * sign-up and following close (registerAttendance, followActivity).
 *
 * Those signed up and following are told a few minutes later
 * (scheduleCancelNotice), as for a new time or place.
 *
 * Shared by the organizer's buttons (cancelActivity, uncancelActivity) and
 * by anything on the server that follows another calendar, which has no
 * user to call the methods as.
 */
export async function setActivityCancelled(
  activity: any,
  {
    cancelled,
    message,
    editorId,
  }: { cancelled: boolean; message?: string; editorId?: string }
) {
  if (!cancelled) {
    await Activities.updateAsync(
      { _id: activity._id },
      { $unset: { cancelledAt: 1, cancelMessage: 1 } }
    );
  } else {
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

  const changed = cancelled !== Boolean(activity.cancelledAt);
  if (changed && activity.isPublicActivity && activity.isPublished) {
    // The event is saved either way; a notice that can't be queued is
    // logged, not reported as a failed save
    await scheduleCancelNotice(activity, cancelled, { editorId }).catch(
      (error) =>
        console.error('[setActivityCancelled] notice not queued', error)
    );
  }
}
