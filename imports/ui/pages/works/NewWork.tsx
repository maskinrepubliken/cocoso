import React, { useState } from 'react';
import { useAtomValue } from 'jotai';

import { currentUserAtom } from '/imports/state';
import { call } from '/imports/api/_utils/shared';
import SuccessRedirector from '/imports/ui/forms/SuccessRedirector';
import useSaveFailed from '/imports/ui/forms/useSaveFailed';

import WorkForm from './WorkForm';

export default function NewWork() {
  const saveFailed = useSaveFailed();
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const currentUser = useAtomValue(currentUserAtom);

  const createWork = async (newWork: any) => {
    try {
      const respond = await call('createWork', newWork);
      setNewEntryId(respond);
    } catch (error: any) {
      saveFailed(error);
    }
  };

  return (
    <SuccessRedirector
      context={`@${currentUser.username}/works`}
      ping={newEntryId}
    >
      <WorkForm onFinalize={createWork} />
    </SuccessRedirector>
  );
}
