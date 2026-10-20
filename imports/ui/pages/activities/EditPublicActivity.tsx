import React, { useState } from 'react';
import { useAtom } from 'jotai';

import { call } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';
import activityErrorText from './form/activityError';
import SuccessRedirector from '/imports/ui/forms/SuccessRedirector';

import PublicActivityForm from './PublicActivityForm';
import { activityAtom } from './ActivityItemHandler';

export default function EditPublicActivity() {
  const [updated, setUpdated] = useState<string | null>(null);
  const [activity, setActivity] = useAtom(activityAtom);

  const updateActivity = async (newActivity: any) => {
    if (!activity) return;
    const activityId = activity._id;
    try {
      await call('updateActivity', activityId, newActivity);
      setActivity(await call('getActivityById', activityId));
      setUpdated(activityId);
      setTimeout(() => {
        setUpdated(null);
      }, 1000);
    } catch (error: any) {
      message.error(activityErrorText(error));
    }
  };

  if (!activity) {
    return null;
  }

  // authorId: the form shows who organizes the event, and an admin who
  // edits it must not take it over by leaving it out.
  const activityFields = (({
    _id,
    address,
    authorId,
    capacity,
    category,
    kinds,
    contact,
    contactUserId,
    datesAndTimes,
    images,
    isExclusiveActivity,
    isRegistrationEnabled,
    locationId,
    isMunicipalityOnly,
    longDescription,
    organizers,
    place,
    resource,
    resourceId,
    subTitle,
    title,
  }) => ({
    _id,
    address,
    authorId,
    capacity,
    category,
    kinds,
    contact,
    contactUserId,
    datesAndTimes,
    images,
    isExclusiveActivity,
    isRegistrationEnabled,
    locationId,
    isMunicipalityOnly,
    longDescription,
    organizers,
    place,
    resource,
    resourceId,
    subTitle,
    title,
  }))(activity);

  return (
    <SuccessRedirector forEdit ping={updated}>
      <PublicActivityForm
        activity={activityFields}
        onFinalize={updateActivity}
      />
    </SuccessRedirector>
  );
}
