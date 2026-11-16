import React, { useState } from 'react';

import { call } from '/imports/api/_utils/shared';
import SuccessRedirector from '/imports/ui/forms/SuccessRedirector';
import useSaveFailed from '/imports/ui/forms/useSaveFailed';

import ResourceForm from './ResourceForm';

// On a place's page (parentId), the new place is part of that one to
// begin with.
export default function NewResource({ parentId }: { parentId?: string }) {
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
      <ResourceForm defaultParentId={parentId} onFinalize={createResource} />
    </SuccessRedirector>
  );
}
