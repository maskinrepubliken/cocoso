import React, { useState } from 'react';

import { call } from '/imports/api/_utils/shared';
import SuccessRedirector from '/imports/ui/forms/SuccessRedirector';
import useSaveFailed from '/imports/ui/forms/useSaveFailed';

import GroupForm from './GroupForm';

export default function NewGroup() {
  const saveFailed = useSaveFailed();
  const [newEntryId, setNewEntryId] = useState<string | null>(null);

  const createGroup = async (newGroup: any) => {
    try {
      const respond = await call('createGroup', newGroup);
      setNewEntryId(respond);
    } catch (error: any) {
      saveFailed(error);
    }
  };

  return (
    <SuccessRedirector context="groups" ping={newEntryId}>
      <GroupForm onFinalize={createGroup} />
    </SuccessRedirector>
  );
}
