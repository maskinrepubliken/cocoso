import React from 'react';
import { useLoaderData, useSearchParams } from 'react-router';

import DocumentUploader from '/imports/ui/forms/DocumentUploader';
import DeleteEntryHandler from '/imports/ui/entry/DeleteEntryHandler';

// The dialogs an admin opens from the gear in the header
// (layout/EditButton.tsx), each through its search parameter.
export default function ResourceAdminFunctions() {
  const { resource, documents } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleClose = () => {
    setSearchParams((params) => ({
      ...params,
      addDocument: 'false',
    }));
  };

  const addDocument = searchParams.get('addDocument') === 'true';

  return (
    <>
      <DocumentUploader
        active={addDocument}
        documents={documents}
        itemId={resource?._id}
        context="resources"
        onClose={handleClose}
      />

      <DeleteEntryHandler item={resource} context="resources" />
    </>
  );
}
