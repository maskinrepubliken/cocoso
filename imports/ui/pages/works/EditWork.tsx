import React, { useState } from 'react';
import { useParams } from 'react-router';
import { useAtom } from 'jotai';

import SuccessRedirector from '/imports/ui/forms/SuccessRedirector';
import useSaveFailed from '/imports/ui/forms/useSaveFailed';
import { call } from '/imports/api/_utils/shared';

import WorkForm from './WorkForm';
import { workAtom } from './WorkItemHandler';

export default function EditWork() {
  const saveFailed = useSaveFailed();
  const [updated, setUpdated] = useState<string | null>(null);
  const [work, setWork] = useAtom(workAtom);
  const { usernameSlug } = useParams<{ usernameSlug: string }>();

  const username = usernameSlug?.replace('@', '') || '';

  const updateWork = async (newWork: any) => {
    if (!work) return;
    const workId = work._id;
    try {
      await call('updateWork', workId, newWork);
      setWork(await call('getWorkById', workId, username));
      setUpdated(workId);
      setTimeout(() => {
        setUpdated(null);
      }, 1000);
    } catch (error: any) {
      saveFailed(error);
    }
  };

  if (!work) {
    return null;
  }

  const workFields = (({
    additionalInfo,
    category,
    contactInfo,
    images,
    locationId,
    isMunicipalityOnly,
    longDescription,
    shortDescription,
    showAvatar,
    title,
  }) => ({
    additionalInfo,
    category,
    contactInfo,
    images,
    locationId,
    isMunicipalityOnly,
    longDescription,
    shortDescription,
    showAvatar,
    title,
  }))(work);

  return (
    <SuccessRedirector forEdit ping={updated}>
      <WorkForm work={workFields} onFinalize={updateWork} />
    </SuccessRedirector>
  );
}
