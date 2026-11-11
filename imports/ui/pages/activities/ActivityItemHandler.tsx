import React, { useEffect } from 'react';
import loadable from '@loadable/component';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';

import { Alert, Center } from '/imports/ui/core';

import ActivityHybrid from '/imports/ui/entry/ActivityHybrid';
import { canCreateContentAtom, renderedAtom, roleAtom } from '/imports/state';
import EditEntryHandler from '/imports/ui/forms/EditEntryHandler.loadable';

const EditPublicActivity = loadable(() => import('./EditPublicActivity'));

export const activityAtom = atom(null);

export default function ActivityItemHandler({ siteDoc }) {
  const { activity } = useLoaderData();
  const navigate = useNavigate();
  const setActivity = useSetAtom(activityAtom);
  const rendered = useAtomValue(renderedAtom);
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const role = useAtomValue(roleAtom);
  const [, setSearchParams] = useSearchParams();
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

      {rendered && canCreateContent && activity.isPublicActivity && (
        <EditEntryHandler
          context="activities"
          onDelete={
            // Admins may delete straight away; the confirm dialog lives in
            // OrganizerToolsSection
            role === 'admin'
              ? () => setSearchParams({ delete: 'true' })
              : undefined
          }
        >
          <EditPublicActivity />
        </EditEntryHandler>
      )}
    </>
  );
}
