import React from 'react';
import { useLoaderData, useSearchParams } from 'react-router';

import DeleteEntryHandler from '/imports/ui/entry/DeleteEntryHandler';
import DocumentUploader from '/imports/ui/forms/DocumentUploader';

// The dialogs a request's author opens from the gear in the header
// (layout/EditButton.tsx), each through its search parameter.
export default function WorkAdminFunctions() {
  const { work, documents } = useLoaderData();
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
        itemId={work._id}
        context="works"
        onClose={handleClose}
      />

      <DeleteEntryHandler item={work} context="works" />
    </>
  );
}
