import React, { useEffect } from 'react';
import loadable from '@loadable/component';
import { useLoaderData, useNavigate } from 'react-router';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';

import { Alert, Center } from '/imports/ui/core';

import ActivityHybrid from '/imports/ui/entry/ActivityHybrid';
import { canCreateContentAtom, renderedAtom } from '/imports/state';
import EditEntryHandler from '/imports/ui/forms/EditEntryHandler.loadable';

const EditCalendarActivity = loadable(
  () => import('../calendar/EditCalendarActivity')
);
const EditPublicActivity = loadable(() => import('./EditPublicActivity'));

export const activityAtom = atom(null);

export default function ActivityItemHandler({ siteDoc }) {
  const { activity } = useLoaderData();
  const navigate = useNavigate();
  const setActivity = useSetAtom(activityAtom);
  const rendered = useAtomValue(renderedAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const [tc] = useTranslation('common');

  useEffect(() => {
    if (activity?.isGroupMeeting) {
      navigate(`/groups/${activity.groupId}`);
      return;
    }
    setActivity(activity);
  }, [activity]);

  // Archived events are served only to their organizer and admins.
  if (!activity) {
    return (
      <Center p="8">
        <Alert message={tc('event.archived.notFound')} />
      </Center>
    );
  }

  return (
    <>
      <ActivityHybrid activity={activity} siteDoc={siteDoc} />

      {rendered && canCreateContent && (
        <EditEntryHandler
          context={activity.isPublicActivity ? 'activities' : 'calendar'}
        >
          {activity.isPublicActivity ? (
            <EditPublicActivity />
          ) : (
            <EditCalendarActivity />
          )}
        </EditEntryHandler>
      )}
    </>
  );
}
