import React, { useState } from 'react';

import { call } from '/imports/api/_utils/shared';
import activityErrorText from './form/activityError';
import SuccessRedirector from '/imports/ui/forms/SuccessRedirector';
import useSaveFailed from '/imports/ui/forms/useSaveFailed';

import PublicActivityForm from './PublicActivityForm';

export default function NewPublicActivity() {
  const saveFailed = useSaveFailed();
  const [newEntryId, setNewEntryId] = useState<string | null>(null);

  const createActivity = async (newActivity: any) => {
    try {
      const respond = await call('createActivity', newActivity);
      setNewEntryId(respond);
    } catch (error: any) {
      saveFailed(error, activityErrorText(error));
    }
  };

  return (
    <SuccessRedirector context="activities" ping={newEntryId}>
      <PublicActivityForm onFinalize={createActivity} />
    </SuccessRedirector>
  );
}
