import React, { useState } from 'react';

import { call } from '/imports/api/_utils/shared';
import SuccessRedirector from '/imports/ui/forms/SuccessRedirector';
import useSaveFailed from '/imports/ui/forms/useSaveFailed';

import ResourceForm from './ResourceForm';

export default function NewResource() {
  const saveFailed = useSaveFailed();
  const [newEntryId, setNewEntryId] = useState<string | null>(null);

  const createResource = async (newResource: any) => {
    try {
      const respond = await call('createResource', newResource);
      setNewEntryId(respond);
    } catch (error: any) {
      saveFailed(error);
    }
  };

  return (
    <SuccessRedirector context="resources" ping={newEntryId}>
      <ResourceForm onFinalize={createResource} />
    </SuccessRedirector>
  );
}
